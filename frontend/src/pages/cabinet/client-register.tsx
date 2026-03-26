import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Shield, Loader2 } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import type { PublicConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UTM_STORAGE_KEY = "stealthnet_utm";

function getUtmFromSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = searchParams.get(k)?.trim();
    if (v) out[k] = v;
  }
  return out;
}

function getStoredUtm(): Record<string, string> {
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, string> = {};
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    for (const k of keys) {
      const v = (parsed as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function storeUtm(utm: Record<string, string>) {
  if (Object.keys(utm).length === 0) return;
  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  } catch {
    // ignore
  }
}

/** UTM из URL с приоритетом, при наличии — сохраняем в localStorage для последующей регистрации */
function useUtmCapture(searchParams: URLSearchParams) {
  const fromUrl = getUtmFromSearchParams(searchParams);
  if (Object.keys(fromUrl).length > 0) storeUtm(fromUrl);
  const fromStorage = getStoredUtm();
  return { ...fromStorage, ...fromUrl };
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: { id: number; first_name?: string; username?: string }) => void;
    };
  }
}

export function ClientRegisterPage() {
  const [error, setError] = useState("");
  const [loading] = useState(false);
  const [brand, setBrand] = useState<{ serviceName: string; logo: string | null }>({
    serviceName: "",
    logo: null,
  });
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(null);
  const [tgAuthPending, setTgAuthPending] = useState(false);
  const [showTgFallback, setShowTgFallback] = useState(false);
  const [telegramBotId, setTelegramBotId] = useState<string | null>(null);
  const tgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tgFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref")?.trim() || undefined;
  const utm = useUtmCapture(searchParams);
  const { loginByTelegramDeepLink, registerByTelegram } = useClientAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getPublicConfig()
      .then((c: PublicConfig) => {
        setBrand({ serviceName: c.serviceName ?? "", logo: c.logo ?? null });
        setTelegramBotUsername(c.telegramBotUsername ?? null);
        setTelegramBotId(c.telegramBotId ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (tgPollRef.current) clearInterval(tgPollRef.current);
      if (tgFallbackTimerRef.current) clearTimeout(tgFallbackTimerRef.current);
    };
  }, []);

  const handleTelegramRegister = useCallback(async () => {
    if (!telegramBotUsername || tgAuthPending) return;
    setError("");
    setTgAuthPending(true);
    setShowTgFallback(false);

    try {
      const { token } = await api.clientTelegramLoginToken();

      const deepLink = `tg://resolve?domain=${telegramBotUsername}&start=auth_${token}`;
      window.open(deepLink, "_blank");

      // Через 15 секунд показываем фоллбэк-кнопку (веб-версия OAuth)
      if (tgFallbackTimerRef.current) clearTimeout(tgFallbackTimerRef.current);
      tgFallbackTimerRef.current = setTimeout(() => setShowTgFallback(true), 15_000);

      if (tgPollRef.current) clearInterval(tgPollRef.current);
      let attempts = 0;
      const maxAttempts = 150; // 5 минут
      tgPollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (tgPollRef.current) clearInterval(tgPollRef.current);
          setTgAuthPending(false);
          setError("Время ожидания истекло. Попробуйте снова.");
          return;
        }
        try {
          const res = await api.clientTelegramLoginCheck(token);
          if (res.confirmed) {
            if (tgPollRef.current) clearInterval(tgPollRef.current);
            if (tgFallbackTimerRef.current) clearTimeout(tgFallbackTimerRef.current);
            loginByTelegramDeepLink(res);
            setTgAuthPending(false);
            navigate("/cabinet/dashboard", { replace: true });
          }
        } catch {
          // Ошибка поллинга — продолжаем
        }
      }, 2000);
    } catch (err) {
      setTgAuthPending(false);
      setError(err instanceof Error ? err.message : "Ошибка авторизации через Telegram");
    }
  }, [telegramBotUsername, tgAuthPending, loginByTelegramDeepLink, navigate]);

  // Обработка OAuth авторизации через Telegram (popup)
  const tgOAuthPopupRef = useRef<Window | null>(null);
  const tgOAuthDoneRef = useRef(false);

  const handleTgOAuthResult = useCallback(
    (authData: { id?: number; username?: string } | false | undefined) => {
      if (!authData || !authData.id || tgOAuthDoneRef.current) return;
      tgOAuthDoneRef.current = true;

      if (tgPollRef.current) clearInterval(tgPollRef.current);
      if (tgFallbackTimerRef.current) clearTimeout(tgFallbackTimerRef.current);
      setTgAuthPending(false);
      setShowTgFallback(false);

      registerByTelegram({
        telegramId: String(authData.id),
        telegramUsername: authData.username,
        referralCode: refCode,
        ...utm,
      })
        .then(() => navigate("/cabinet/dashboard", { replace: true }))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка авторизации через Telegram"));
    },
    [registerByTelegram, navigate, refCode, utm],
  );

  // Слушаем postMessage от попапа (Telegram шлёт JSON-строку с event:"auth_result")
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.origin.includes("telegram.org")) return;
      if (tgOAuthPopupRef.current && event.source !== tgOAuthPopupRef.current) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "auth_result") {
          handleTgOAuthResult(data.result);
        }
      } catch {
        // не JSON — игнорируем
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [handleTgOAuthResult]);

  const handleTelegramOAuthFallback = useCallback(() => {
    if (!telegramBotId) return;
    tgOAuthDoneRef.current = false;
    const popupUrl =
      `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(telegramBotId)}` +
      `&origin=${encodeURIComponent(window.location.origin)}` +
      `&request_access=write` +
      `&return_to=${encodeURIComponent(window.location.href)}`;
    const w = 550;
    const h = 470;
    const left = Math.max(0, (screen.width - w) / 2) + ((screen as unknown as Record<string, number>).availLeft || 0);
    const top = Math.max(0, (screen.height - h) / 2) + ((screen as unknown as Record<string, number>).availTop || 0);
    const popup = window.open(
      popupUrl,
      "telegram_oauth_bot" + telegramBotId,
      `width=${w},height=${h},left=${left},top=${top},status=0,location=0,menubar=0,toolbar=0`,
    );
    tgOAuthPopupRef.current = popup;

    // Мониторим закрытие попапа — если юзер уже залогинен, Telegram закроет окно
    // и данные нужно получить через XHR fallback (как делает оригинальный виджет)
    if (popup) {
      const checkClosed = () => {
        if (!popup || popup.closed) {
          if (tgOAuthDoneRef.current) return;
          // Попап закрылся без postMessage — пробуем получить данные через API
          fetch("https://oauth.telegram.org/auth/get", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            credentials: "include",
            body: `bot_id=${encodeURIComponent(telegramBotId)}`,
          })
            .then((r) => r.json())
            .then((result: { user?: { id?: number; username?: string }; origin?: string }) => {
              if (result.user) {
                handleTgOAuthResult(result.user);
              }
            })
            .catch(() => {
              // XHR fallback тоже не сработал — ничего не делаем
            });
          return;
        }
        setTimeout(checkClosed, 100);
      };
      setTimeout(checkClosed, 100);
    }
  }, [telegramBotId, handleTgOAuthResult]);

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-transparent p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2 mb-6 min-h-[2.5rem]">
          {brand.logo ? (
            <span className="flex items-center justify-center h-11 px-3 rounded-xl dark:bg-transparent bg-zinc-900">
              <img src={brand.logo} alt="" className="h-8 max-w-[140px] object-contain" />
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
              <Shield className="h-6 w-6" />
            </span>
          )}
          {brand.serviceName ? <span className="font-semibold text-xl">{brand.serviceName}</span> : null}
        </div>
        <Card className="border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="rounded-lg bg-primary/10 p-3">
                <UserPlus className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Регистрация</CardTitle>
            <p className="text-muted-foreground text-sm">Создайте аккаунт в кабинете</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
                  {error}
                </div>
              )}
              {telegramBotUsername && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 gap-2"
                      onClick={handleTelegramRegister}
                      disabled={loading || tgAuthPending}
                    >
                      {tgAuthPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Ожидаем подтверждение…
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                          Зарегистрироваться через Telegram
                        </>
                      )}
                    </Button>
                    {showTgFallback && telegramBotId && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-9 gap-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleTelegramOAuthFallback}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        Не открылся Telegram? Войти через веб-версию
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
