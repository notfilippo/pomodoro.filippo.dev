import { useParams } from "react-router-dom";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  Button,
  ButtonGroup,
  Center,
  Flex,
  Link,
  List,
  ListItem,
  Text,
  Tooltip,
} from "@chakra-ui/react";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Worker from "../worker?worker";
import {
  DEFAULT_TIMER,
  Pomodoro,
  getSessionName,
  getSessionTime,
} from "../lib/pomodoro";
import { randomColor, randomUsername } from "../lib/awareness";
import { useLocalStorage } from "usehooks-ts";

const CORRECTION_FACTOR = 1100;

const worker = new Worker();

type UserState = {
  username: string;
  color: string;
};

export default function Room() {
  const { id } = useParams();

  const [username, setUsername] = useLocalStorage("username", randomUsername());

  const me = useMemo(
    () => ({
      id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
      color: randomColor(),
      username,
    }),
    [username],
  );

  const [users, setUsers] = useState<UserState[]>([]);

  const [ytimer, setYTimer] = useState<Y.Map<unknown> | null>(null);
  const [timer, setTimer] = useState({ ...DEFAULT_TIMER });

  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    worker.postMessage({ timer });
  }, [timer]);

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

    yprovider.awareness.setLocalState(me);

    yprovider.awareness.on("change", () => {
      setUsers(
        Array.from(yprovider.awareness.getStates().values()).map((user) => ({
          id: user.id,
          username: user.username,
          color: user.color,
        })),
      );
    });

    setYTimer(ytimer);

    return () => {
      yprovider.destroy();
      ydoc.destroy();
      setYTimer(null);
    };
  }, [id, me]);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    document.addEventListener("visibilitychange", forceUpdate);
    return () => document.removeEventListener("visibilitychange", forceUpdate);
  }, [forceUpdate]);

  const updateTimer = useCallback(
    (fn: (timer: Pomodoro) => Pomodoro) => {
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
  };

  const resetTimer = () => {
    updateTimer((timer) => ({
      ...timer,
      expiration: 0,
      running: false,
    }));
  };

  const stopAndAdvance = useCallback(() => {
    updateTimer((timer) => ({
      ...timer,
      session: timer.session + 1,
      expiration: 0,
      running: false,
    }));
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

  const editUsername = () => {
    const newUsername = prompt("New username", me.username);
    if (newUsername) {
      setUsername(newUsername);
    }
  };

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
      <List p={4} textAlign="right" position="absolute" top="0" right="0">
        {users.map((user) => (
          <ListItem key={user.username} style={{ color: user.color }}>
            {user.username}{" "}
            {user.username === me.username && (
              <Link color="gray" onClick={editUsername}>
                (you)
              </Link>
            )}
          </ListItem>
        ))}
      </List>
    </Center>
  );
}
