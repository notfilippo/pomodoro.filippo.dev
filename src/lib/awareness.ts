import { generateSlug } from "random-word-slugs";

export function randomColor() {
  const number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const hue = number * 137.508; // use golden angle approximation
  return `hsl(${hue},50%,75%)`;
}

export function randomUsername() {
  return generateSlug();
}
