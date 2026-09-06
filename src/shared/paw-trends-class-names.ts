import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combines conditional Paw Trends classes without Tailwind conflicts. */
export function mergePawTrendsClassNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
