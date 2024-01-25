import { useParams } from "react-router-dom";

import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonGroup, Center, Flex, Text } from "@chakra-ui/react";

interface Timer {
  expiration: number;
  running: boolean;
  session: number;
  focus: number;
  break: number;
  longBreak: number;
}

const DEFAULT_TIMER: Timer = {
  expiration: 0,
  running: false,
  session: 0,
  focus: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
};

const CORRECTION_FACTOR = 1100;

function getSessionTime(timer: Timer): number {
  if ((timer.session + 1) % 4 === 0) {
    return timer.longBreak;
  } else if ((timer.session + 1) % 2 === 0) {
    return timer.break;
  }

  return timer.focus;
}

function getSessionName(timer: Timer): string {
  if ((timer.session + 1) % 4 === 0) {
    return "Long Break";
  } else if ((timer.session + 1) % 2 === 0) {
    return "Break";
  }

  return "Focus";
}

export default function Room() {
  const { id } = useParams();

  const [map, setMap] = useState<Y.Map<unknown> | null>(null);

  const [timer, setTimerNative] = useState<Timer>({ ...DEFAULT_TIMER });

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const setTimer = useCallback(
    (t: Timer | ((t: Timer) => Timer)) => {
      setTimerNative((old) => {
        const timer = typeof t === "function" ? t(old) : t;
        map?.set("expiration", timer.expiration);
        map?.set("running", timer.running);
        map?.set("session", timer.session);
        map?.set("focus", timer.focus);
        map?.set("break", timer.break);
        map?.set("longBreak", timer.longBreak);
        return timer;
      });
    },
    [map],
  );

  const tick = useCallback(() => {
    if (!timer.running) return;

    const remaining = timer.expiration - Date.now();

    setHours(Math.max(Math.floor(remaining / 1000 / 60 / 60), 0));
    setMinutes(Math.max(Math.floor((remaining / 1000 / 60) % 60), 0));
    setSeconds(Math.max(Math.floor((remaining / 1000) % 60), 0));

    if (remaining <= 0) {
      setTimer((timer) => ({
        ...timer,
        running: false,
        session: timer.session + 1,
      }));
    }
  }, [timer, setTimer]);

  useEffect(() => {
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    if (!id) return;

    const ydoc = new Y.Doc();
    new WebrtcProvider(id ?? "default", ydoc);

    const ymap = ydoc.getMap("start");

    ymap.observe(() => {
      setTimerNative({
        expiration: Number(ymap.get("expiration")) ?? DEFAULT_TIMER.expiration,
        running: Boolean(ymap.get("running")) ?? DEFAULT_TIMER.running,
        session: Number(ymap.get("session")) ?? DEFAULT_TIMER.session,
        focus: Number(ymap.get("focus")) ?? DEFAULT_TIMER.focus,
        break: Number(ymap.get("break")) ?? DEFAULT_TIMER.break,
        longBreak: Number(ymap.get("longBreak")) ?? DEFAULT_TIMER.longBreak,
      });
    });

    setMap(ymap);

    return () => ydoc.destroy();
  }, [id, setTimerNative]);

  const startTimer = () => {
    const next = getSessionTime(timer) * 1000 + CORRECTION_FACTOR;
    setTimer((timer) => ({
      ...timer,
      expiration: Date.now() + next,
      running: true,
    }));
  };

  const stopTimer = () => {
    setTimer((timer) => ({
      ...timer,
      running: false,
    }));
  };

  return (
    <Center h="100vh">
      <Flex direction="column" alignItems="center" gap={2}>
        <Text>
          {getSessionName(timer)} {timer.session + 1}
        </Text>
        <Text fontSize="6xl" fontFamily="'Azeret Mono', monospace">
          {hours.toString().padStart(2, "0")}:
          {minutes.toString().padStart(2, "0")}:
          {seconds.toString().padStart(2, "0")}
        </Text>
        <ButtonGroup>
          <Button onClick={startTimer}>Start</Button>
          <Button onClick={stopTimer}>Stop</Button>
        </ButtonGroup>
      </Flex>
    </Center>
  );
}
