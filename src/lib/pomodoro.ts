export type Pomodoro = {
  expiration: number;
  running: boolean;
  session: number;
  focus: number;
  break: number;
  longBreak: number;
};

export const DEFAULT_TIMER: Pomodoro = {
  expiration: 0,
  running: false,
  session: 0,
  focus: import.meta.env.DEV ? 4 : 25 * 60,
  break: import.meta.env.DEV ? 3 : 5 * 60,
  longBreak: import.meta.env.DEV ? 6 : 30 * 60,
};

export function getSessionTime(timer: Readonly<Pomodoro> | null): number {
  if (!timer) return 0;

  if ((timer.session + 1) % 4 === 0) {
    return timer.longBreak;
  } else if ((timer.session + 1) % 2 === 0) {
    return timer.break;
  }

  return timer.focus;
}

export function getSessionName(timer: Readonly<Pomodoro> | null): string {
  if (!timer) return "Focus";

  if ((timer.session + 1) % 4 === 0) {
    return "Long Break";
  } else if ((timer.session + 1) % 2 === 0) {
    return "Break";
  }

  return "Focus";
}
