import { useParams } from "react-router-dom";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  Button,
  ButtonGroup,
  Center,
  Flex,
  Text,
  Tooltip,
} from "@chakra-ui/react";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

type Timer = {
  expiration: number;
  running: boolean;
  session: number;
  focus: number;
  break: number;
  longBreak: number;
};

const DEFAULT_TIMER: Timer = {
  expiration: 0,
  running: false,
  session: 0,
  focus: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
};

const CORRECTION_FACTOR = 1100;

function notify(text: string) {
  if (!("Notification" in window)) {
    return;
  }

  const notification = () =>
    new Notification("Pomodoro", {
      icon: "/notification.png",
      body: text,
    });

  if (Notification.permission === "granted") {
    notification();
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        notification();
      }
    });
  }
}

function getSessionTime(timer: Readonly<Timer> | null): number {
  if (!timer) return 0;

  if ((timer.session + 1) % 4 === 0) {
    return timer.longBreak;
  } else if ((timer.session + 1) % 2 === 0) {
    return timer.break;
  }

  return timer.focus;
}

function getSessionName(timer: Readonly<Timer> | null): string {
  if (!timer) return "Focus";

  if ((timer.session + 1) % 4 === 0) {
    return "Long Break";
  } else if ((timer.session + 1) % 2 === 0) {
    return "Break";
  }

  return "Focus";
}

export default function Room() {
  const { id } = useParams();

  const [ytimer, setYTimer] = useState<Y.Map<unknown> | null>(null);
  const [timer, setTimer] = useState({ ...DEFAULT_TIMER });

  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!id) return;
    const ydoc = new Y.Doc();

    console.log("connecting to", import.meta.env.VITE_WEBSOCKET_PROVIDER);
    const yprovider = new WebsocketProvider(
      import.meta.env.VITE_WEBSOCKET_PROVIDER,
      id,
      ydoc,
    );

    const ytimer = ydoc.getMap("timer");
    ytimer.observeDeep(() => {
      console.log("timer changed", ytimer.toJSON());
      setTimer({ ...DEFAULT_TIMER, ...ytimer.toJSON() });
    });

    setYTimer(ytimer);

    return () => {
      yprovider.destroy();
      ydoc.destroy();
      setYTimer(null);
    };
  }, [id]);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    document.addEventListener("visibilitychange", forceUpdate);
    return () => document.removeEventListener("visibilitychange", forceUpdate);
  }, [forceUpdate]);

  const updateTimer = useCallback(
    (fn: (timer: Timer) => Timer) => {
      setTimer((timer) => {
        const updatedTimer = fn(timer);
        ytimer?.set("expiration", updatedTimer.expiration);
        ytimer?.set("running", updatedTimer.running);
        ytimer?.set("session", updatedTimer.session);
        ytimer?.set("focus", updatedTimer.focus);
        ytimer?.set("break", updatedTimer.break);
        ytimer?.set("longBreak", updatedTimer.longBreak);
        return updatedTimer;
      });
    },
    [ytimer],
  );

  const startTimer = () => {
    const expiration =
      Date.now() + getSessionTime(timer) * 1000 + CORRECTION_FACTOR;
    updateTimer((timer) => ({
      ...timer,
      expiration,
      running: true,
    }));
    notify("Timer started");
  };

  const resetTimer = () => {
    updateTimer((timer) => ({
      ...timer,
      expiration: 0,
      running: false,
    }));
    notify("Timer reset");
  };

  const stopAndAdvance = useCallback(() => {
    updateTimer((timer) => ({
      ...timer,
      session: timer.session + 1,
      expiration: 0,
      running: false,
    }));
    notify("Timer finished");
  }, [updateTimer]);

  const tick = useCallback(() => {
    if (!timer) return;

    const remaining = timer.expiration - Date.now();

    setMinutes(Math.max(Math.floor((remaining / 1000 / 60) % 60), 0));
    setSeconds(Math.max(Math.floor((remaining / 1000) % 60), 0));

    if (remaining <= 0 && timer.running) {
      stopAndAdvance();
    }
  }, [timer, stopAndAdvance]);

  useEffect(() => {
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [tick]);

  return (
    <Center h="100vh">
      <Flex direction="column" alignItems="center" gap={2}>
        <Text>
          {getSessionName(timer)} ({timer.session})
        </Text>
        <Text fontSize="6xl" className="timer">
          {minutes.toString().padStart(2, "0")}:
          {seconds.toString().padStart(2, "0")}
        </Text>
        <ButtonGroup>
          <Button onClick={startTimer} isDisabled={timer?.running}>
            Start
          </Button>
          <Tooltip label="⚠️ This will reset the timer for everyone">
            <Button onClick={resetTimer} isDisabled={!timer?.running}>
              Reset
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Flex>
    </Center>
  );
}
