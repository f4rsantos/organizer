import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function sortByOrder(arr) {
  return [...arr].sort((a, b) => a.order - b.order)
}
