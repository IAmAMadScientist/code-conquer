// src/lib/utils.js
// Tailwind-friendly className helper.
// - clsx handles conditional classes
// - tailwind-merge resolves conflicting utilities (e.g. "p-2" + "p-4" -> "p-4")
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
