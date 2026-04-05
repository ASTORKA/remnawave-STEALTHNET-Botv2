import { useEffect } from "react";

/** Совпадает с тёмным фоном кабинета / theme-color — шапка Telegram сливается с контентом, выглядит компактнее */
const TG_SURFACE_HEX = "#0f172a";

type TelegramWebAppLike = {
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  requestFullscreen?: () => void;
  isVersionAtLeast?: (ver: string) => boolean;
};

/**
 * Настройка нативного UI Telegram Mini App: единый цвет шапки и фона, по возможности полноэкранный режим
 * (меньше «плашка» с названием бота по центру — как на референсах в свежих клиентах).
 * Текст «мини-приложение» задаётся в BotFather у кнопки Web App, из веба не убрать.
 */
export function useTelegramMiniappChrome(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const tg = (window as Window & { Telegram?: { WebApp?: TelegramWebAppLike } }).Telegram?.WebApp;
    if (!tg) return;

    try {
      tg.ready();
    } catch {
      /* ignore */
    }
    try {
      tg.expand();
    } catch {
      /* ignore */
    }

    try {
      tg.setBackgroundColor(TG_SURFACE_HEX);
      tg.setHeaderColor(TG_SURFACE_HEX);
      if (typeof tg.setBottomBarColor === "function" && tg.isVersionAtLeast?.("7.10")) {
        tg.setBottomBarColor(TG_SURFACE_HEX);
      }
    } catch {
      /* старые клиенты без hex для header */
    }

    if (tg.isVersionAtLeast?.("8.0") && typeof tg.requestFullscreen === "function") {
      try {
        tg.requestFullscreen();
      } catch {
        /* не все клиенты разрешают сразу */
      }
    }
  }, [enabled]);
}
