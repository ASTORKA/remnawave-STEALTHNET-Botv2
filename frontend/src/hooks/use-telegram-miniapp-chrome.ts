import { useEffect, useRef } from "react";

/** Совпадает с тёмным фоном кабинета / theme-color — шапка Telegram сливается с контентом, выглядит компактнее */
const TG_SURFACE_HEX = "#0f172a";

const NARROW_MAX_W = 768;

type TelegramWebAppLike = {
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  isVersionAtLeast?: (ver: string) => boolean;
};

function isNarrowViewport() {
  return typeof window !== "undefined" && window.innerWidth < NARROW_MAX_W;
}

/**
 * Настройка нативного UI Telegram Mini App: единый цвет шапки и фона.
 * Полноэкранный режим — только на узком экране (телефон), не на Telegram Desktop / широком окне.
 */
export function useTelegramMiniappChrome(enabled: boolean) {
  const requestedFs = useRef(false);

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

    requestedFs.current = false;
    if (
      isNarrowViewport() &&
      tg.isVersionAtLeast?.("8.0") &&
      typeof tg.requestFullscreen === "function"
    ) {
      try {
        tg.requestFullscreen();
        requestedFs.current = true;
      } catch {
        /* ignore */
      }
    }

    const onResize = () => {
      if (!isNarrowViewport() && requestedFs.current && typeof tg.exitFullscreen === "function") {
        try {
          tg.exitFullscreen();
          requestedFs.current = false;
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (requestedFs.current && typeof tg.exitFullscreen === "function") {
        try {
          tg.exitFullscreen();
        } catch {
          /* ignore */
        }
        requestedFs.current = false;
      }
    };
  }, [enabled]);
}
