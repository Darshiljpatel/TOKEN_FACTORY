import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupees(amount: number): string {
  if (amount <= 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}
