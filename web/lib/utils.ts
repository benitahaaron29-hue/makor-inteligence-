import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn-style class-name helper.
 * Combines clsx (conditional / object syntax) with tailwind-merge
 * (resolves conflicting Tailwind utility classes).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
