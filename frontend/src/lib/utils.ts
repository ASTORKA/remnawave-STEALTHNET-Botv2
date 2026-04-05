import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** СБП / крипта в подписях Platega и т.п. — для белой кнопки в мини-кабинете */
export function isSbpOrCryptoPaymentLabel(label: string): boolean {
  return /сбп|спб|крипт|crypto/i.test(label);
}

/** Мини-кабинет: те же белые кнопки, что «Оплатить с баланса» */
export const cabinetMiniWhitePayButtonClass =
  "justify-start gap-4 px-6 h-16 rounded-2xl border border-black/10 bg-white text-zinc-900 shadow-md hover:bg-zinc-50 dark:border-black/10 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-50";

export const cabinetMiniGlassPanelClass =
  "rounded-2xl border border-white/20 bg-background/50 shadow-sm backdrop-blur-md transition-colors hover:border-primary/35 dark:border-white/[0.08]";

export const cabinetMiniGlassCardClass =
  "rounded-2xl border border-white/20 bg-background/50 backdrop-blur-md shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md dark:border-white/[0.08]";
