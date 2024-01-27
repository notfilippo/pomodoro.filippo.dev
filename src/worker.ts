import { Pomodoro } from "./lib/pomodoro";

function notify(text: string) {
  if (!("Notification" in self)) {
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

let timeout: number | undefined = undefined;

self.addEventListener("message", (event) => {
  const timer = event.data.timer as Pomodoro;

  const delta = timer.expiration - Date.now();

  if (timeout) clearTimeout(timeout);
  if (!timer.running) return;

  timeout = setTimeout(() => {
    notify("Timer completed!");
  }, delta);
});
