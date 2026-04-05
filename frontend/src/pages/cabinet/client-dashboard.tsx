import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  
  Package,
  Wallet,
  Wifi,
  Calendar,
  
  
  ArrowRight,
  PlusCircle,
  
  Copy,
  Check,
  Gift,
  Loader2,
  Users,
  
  AlertCircle,
  Zap
} from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { useCabinetConfig } from "@/contexts/cabinet-config";
import { useCabinetMiniapp } from "@/pages/cabinet/cabinet-layout";
import { api } from "@/lib/api";
import { formatRuDays } from "@/lib/i18n";
import type { ClientPayment, ClientReferralStats } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase() === "RUB" ? "RUB" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + " ГБ";
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + " МБ";
  return (bytes / 1024).toFixed(0) + " КБ";
}


function getSubscriptionPayload(sub: unknown): Record<string, unknown> | null {
  if (!sub || typeof sub !== "object") return null;
  const raw = sub as Record<string, unknown>;
  if (raw.response && typeof raw.response === "object") return raw.response as Record<string, unknown>;
  if (raw.data && typeof raw.data === "object") {
    const d = raw.data as Record<string, unknown>;
    if (d.response && typeof d.response === "object") return d.response as Record<string, unknown>;
  }
  return raw;
}

function parseSubscription(sub: unknown): {
  status?: string;
  expireAt?: string;
  trafficUsed?: number;
  trafficLimitBytes?: number;
  hwidDeviceLimit?: number;
  subscriptionUrl?: string;
  productName?: string;
} {
  const o = getSubscriptionPayload(sub);
  if (!o) return {};
  const userTraffic = o.userTraffic && typeof o.userTraffic === "object" ? (o.userTraffic as Record<string, unknown>) : null;
  const usedBytes = userTraffic != null && typeof userTraffic.usedTrafficBytes === "number"
    ? userTraffic.usedTrafficBytes
    : typeof o.trafficUsed === "number"
      ? o.trafficUsed
      : undefined;
  const subUrl = typeof o.subscriptionUrl === "string" ? o.subscriptionUrl : undefined;
  const productName = typeof o.productName === "string" ? o.productName.trim() : undefined;
  const subscriptionProductName = typeof (o as Record<string, unknown>).subscriptionProductName === "string" ? (o as Record<string, unknown>).subscriptionProductName as string : undefined;
  return {
    status: typeof o.status === "string" ? o.status : undefined,
    expireAt: typeof o.expireAt === "string" ? o.expireAt : undefined,
    trafficUsed: usedBytes,
    trafficLimitBytes: typeof o.trafficLimitBytes === "number" ? o.trafficLimitBytes : undefined,
    hwidDeviceLimit: typeof o.hwidDeviceLimit === "number" ? o.hwidDeviceLimit : (o.hwidDeviceLimit != null ? Number(o.hwidDeviceLimit) : undefined),
    subscriptionUrl: subUrl?.trim() || undefined,
    productName: productName || subscriptionProductName || undefined,
  };
}

export function ClientDashboardPage() {
  const { state, refreshProfile } = useClientAuth();
  const config = useCabinetConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<unknown>(null);
  const [tariffDisplayName, setTariffDisplayName] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [_payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMessage, setPaymentMessage] = useState<"success_topup" | "success_tariff" | "success" | "failed" | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [_referralStats, setReferralStats] = useState<ClientReferralStats | null>(null);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);

  const token = state.token;
  const isMiniapp = useCabinetMiniapp();
  const reduceMotion = useReducedMotion();
  const client = state.client;
  const showTrial = config?.trialEnabled && !client?.trialUsed;
  const trialDays = config?.trialDays ?? 0;

  useEffect(() => {
    const payment = searchParams.get("payment");
    const yoomoneyForm = searchParams.get("yoomoney_form");
    const paymentKind = searchParams.get("payment_kind");
    if (payment === "success") {
      if (paymentKind === "topup") setPaymentMessage("success_topup");
      else if (paymentKind === "tariff") setPaymentMessage("success_tariff");
      else setPaymentMessage("success");
      setSearchParams({}, { replace: true });
      if (token) refreshProfile().catch(() => {});
    } else if (payment === "failed") {
      setPaymentMessage("failed");
      setSearchParams({}, { replace: true });
      if (token) refreshProfile().catch(() => {});
    } else if (yoomoneyForm === "success") {
      setSearchParams({}, { replace: true });
      if (token) refreshProfile().catch(() => {});
    } else if (searchParams.get("yookassa") === "success") {
      setSearchParams({}, { replace: true });
      if (token) refreshProfile().catch(() => {});
    } else if (searchParams.get("heleket") === "success") {
      setSearchParams({}, { replace: true });
      if (token) refreshProfile().catch(() => {});
    }
  }, [searchParams, setSearchParams, token, refreshProfile]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setSubscriptionError(null);
    Promise.all([
      api.clientSubscription(token),
      api.clientPayments(token),
      api.getClientDevices(token).catch(() => ({ total: 0 })),
    ])
      .then(([subRes, payRes, devRes]) => {
        if (cancelled) return;
        setSubscription(subRes.subscription ?? null);
        setTariffDisplayName(subRes.tariffDisplayName ?? null);
        if (subRes.message) setSubscriptionError(subRes.message);
        setPayments(payRes.items ?? []);
        setDeviceCount(devRes.total ?? null);
      })
      .catch((e) => {
        if (!cancelled) setSubscriptionError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!token || !isMiniapp) return;
    api.getClientReferralStats(token).then(setReferralStats).catch(() => {});
  }, [token, isMiniapp]);

  async function toggleAutoRenew(enabled: boolean) {
    if (!token || !client) return;
    setAutoRenewLoading(true);
    try {
      await api.clientUpdateAutoRenew(token, { enabled });
      await refreshProfile();
    } catch (err) {
      console.error("Failed to toggle auto-renew", err);
    } finally {
      setAutoRenewLoading(false);
    }
  }

  async function activateTrial() {
    if (!token) return;
    setTrialError(null);
    setTrialLoading(true);
    try {
      await api.clientActivateTrial(token);
      await refreshProfile();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : "Ошибка активации триала");
    } finally {
      setTrialLoading(false);
    }
  }

  if (!client) return null;

  const subParsed = parseSubscription(subscription);
  const hasActiveSubscription =
    subscription && typeof subscription === "object" && (subParsed.status === "ACTIVE" || subParsed.status === undefined);
  const vpnUrl = subParsed.subscriptionUrl || null;
  const [referralCopied, setReferralCopied] = useState<"site" | "bot" | null>(null);
  const siteOrigin = config?.publicAppUrl?.replace(/\/$/, "") || (typeof window !== "undefined" ? window.location.origin : "");
  const referralLinkSite =
    client.referralCode && siteOrigin
      ? `${siteOrigin}/cabinet/register?ref=${encodeURIComponent(client.referralCode)}`
      : "";
  const referralLinkBot =
    client.referralCode && config?.telegramBotUsername
      ? `https://t.me/${config.telegramBotUsername.replace(/^@/, "")}?start=ref_${client.referralCode}`
      : "";
  const hasReferralLinks = Boolean(referralLinkSite || referralLinkBot);
  const copyReferral = (which: "site" | "bot") => {
    const url = which === "site" ? referralLinkSite : referralLinkBot;
    if (url) {
      navigator.clipboard.writeText(url);
      setReferralCopied(which);
      setTimeout(() => setReferralCopied(null), 2000);
    }
  };
  const trafficPercent = subParsed.trafficLimitBytes != null && subParsed.trafficLimitBytes > 0 && subParsed.trafficUsed != null
    ? Math.min(100, Math.round((subParsed.trafficUsed / subParsed.trafficLimitBytes) * 100))
    : null;

  const expireDate = subParsed.expireAt ? (() => { try { const d = new Date(subParsed.expireAt); return Number.isNaN(d.getTime()) ? null : d; } catch { return null; } })() : null;
  const daysLeft = expireDate && expireDate > new Date()
    ? Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  // Компонент-состояние отсутствия подписки
  const NoSubscriptionState = () => (
    <div className="flex flex-col items-center justify-center space-y-3 py-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
        <Package className="h-8 w-8 text-primary/80" />
      </div>
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Нет активной подписки</h3>
        <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
          У вас пока нет привязанной подписки. Перейдите во вкладку Тарифы, чтобы выбрать и оплатить доступ.
        </p>
      </div>
      <Button className="mt-1 h-11 rounded-xl px-6 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.4)] transition-transform duration-300 hover:scale-[1.02] [&_svg]:self-center [&_span]:leading-none" asChild>
        <Link to="/cabinet/tariffs" className="inline-flex items-center justify-center gap-2">
          <span className="inline-flex items-center leading-none">Выбрать тариф</span>
        </Link>
      </Button>
    </div>
  );

  if (isMiniapp) {
    const miniStagger = {
      hidden: {},
      show: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.09,
          delayChildren: reduceMotion ? 0 : 0.05,
        },
      },
    };
    const miniItem = {
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 },
      show: {
        opacity: 1,
        y: 0,
        transition: reduceMotion
          ? { duration: 0 }
          : { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.88 },
      },
    };

    return (
      <motion.div
        className="w-full min-w-0 space-y-3 overflow-x-hidden"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {(paymentMessage === "success" || paymentMessage === "success_topup" || paymentMessage === "success_tariff") && (
          <motion.div
            layout
            initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-green-500/30 bg-green-500/[0.1] px-3 py-2.5 text-xs font-medium text-green-800 shadow-[0_0_40px_-16px_rgba(34,197,94,0.45),0_1px_0_0_rgba(255,255,255,0.08)_inset] backdrop-blur-md dark:text-green-300 dark:border-green-400/25 dark:bg-green-500/[0.12]"
          >
            {paymentMessage === "success_topup"
              ? "Оплата прошла успешно. Баланс пополнен."
              : paymentMessage === "success_tariff"
                ? "Оплата прошла успешно. Тариф активируется автоматически."
                : "Оплата прошла успешно. Статус обновляется автоматически."}
          </motion.div>
        )}
        {paymentMessage === "failed" && (
          <motion.div
            layout
            initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-destructive/30 bg-destructive/[0.09] px-3 py-2.5 text-xs font-medium text-destructive shadow-[0_0_36px_-14px_hsl(var(--destructive)/0.4),0_1px_0_0_rgba(255,255,255,0.06)_inset] backdrop-blur-md dark:bg-destructive/12"
          >
            Оплата не прошла. Попробуйте снова.
          </motion.div>
        )}

        <motion.div variants={miniStagger} initial="hidden" animate="show" className="space-y-3">
        {/* 1. Статус, подключение, тариф / дата / трафик — компактно */}
        <motion.section variants={miniItem} className="cabinet-mini-glass relative w-full max-w-full self-start overflow-hidden p-3.5 sm:p-4">
          <div
            className="cabinet-mini-glass__blob -right-12 -top-16 h-28 w-28 rounded-full bg-gradient-to-bl from-primary/28 via-primary/8 to-transparent blur-2xl dark:from-primary/32"
            aria-hidden
          />
          <div
            className="cabinet-mini-glass__blob -bottom-6 -left-10 h-24 w-24 rounded-full bg-gradient-to-tr from-cyan-500/14 to-transparent blur-2xl dark:from-cyan-400/18"
            aria-hidden
          />
          <div className="cabinet-mini-glass__body">
          <h2 className="mb-3 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <div className="rounded-xl border border-white/30 bg-gradient-to-br from-primary/20 to-primary/5 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] ring-1 ring-primary/15 backdrop-blur-sm dark:border-white/10">
              <Zap className="h-4 w-4 shrink-0 text-primary" />
            </div>
            Статус подписки
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : subscriptionError || !hasActiveSubscription ? (
            <NoSubscriptionState />
          ) : (
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/35 bg-green-500/[0.12] px-2.5 py-1 text-xs font-semibold text-green-800 backdrop-blur-sm dark:border-green-400/30 dark:text-green-300 dark:bg-green-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                  Активна
                </span>
                {daysLeft != null && (
                  <span className="rounded-full border border-white/20 bg-background/50 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur-sm dark:border-white/10">
                    Осталось {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
                  </span>
                )}
                {subParsed.hwidDeviceLimit != null && subParsed.hwidDeviceLimit > 0 && deviceCount != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                    📱 {deviceCount} / {subParsed.hwidDeviceLimit}
                  </span>
                )}
              </div>

              {vpnUrl ? (
                <div className="space-y-3 rounded-2xl border border-white/20 bg-background/50 p-3.5 shadow-sm backdrop-blur-md transition-colors hover:border-primary/20 dark:border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                      <Wifi className="h-5 w-5 shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Подключение</p>
                      <p className="text-sm leading-snug text-muted-foreground">Приложения и настройка — по ссылке или кнопке ниже.</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <code
                      className="font-mono flex min-w-0 flex-1 items-center truncate rounded-xl border border-white/20 bg-background/55 px-3 py-2.5 text-xs text-foreground/90 shadow-inner dark:border-white/[0.08]"
                      title={vpnUrl}
                    >
                      {vpnUrl}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-11 w-11 shrink-0 rounded-xl border-white/25 bg-background/70 dark:border-white/10"
                      onClick={() => {
                        navigator.clipboard.writeText(vpnUrl);
                        window.Telegram?.WebApp?.showPopup?.({ title: "Скопировано", message: "Ссылка в буфере обмена" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <Button
                      className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/85 p-0 text-primary-foreground shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98]"
                      asChild
                    >
                      <Link
                        to="/cabinet/subscribe"
                        className="inline-flex items-center justify-center"
                        aria-label="Подключиться к VPN"
                      >
                        <Wifi className="h-8 w-8 shrink-0" />
                      </Link>
                    </Button>
                    <span className="text-center text-xs font-semibold text-foreground">Подключиться к VPN</span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2.5">
                {((tariffDisplayName ?? subParsed.productName) || client?.trialUsed) && (
                  <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-background/50 p-3.5 shadow-sm backdrop-blur-md transition-colors hover:border-primary/25 dark:border-white/[0.08]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Тариф</p>
                      <p className="truncate text-[15px] font-semibold text-foreground" title={((tariffDisplayName ?? subParsed.productName?.trim() ?? "").trim()) || "Триал"}>
                        {((tariffDisplayName ?? subParsed.productName?.trim() ?? "").trim()) || "Триал"}
                      </p>
                    </div>
                  </div>
                )}
                {subParsed.expireAt && (
                  <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-background/50 p-3.5 shadow-sm backdrop-blur-md transition-colors hover:border-primary/25 dark:border-white/[0.08]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Действует до</p>
                      <p className="text-[15px] font-semibold text-foreground">{formatDate(subParsed.expireAt)}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-3 rounded-2xl border border-white/20 bg-background/50 p-3.5 shadow-sm backdrop-blur-md transition-colors hover:border-primary/25 dark:border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Трафик</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[15px] font-semibold text-foreground">
                          {subParsed.trafficLimitBytes != null && subParsed.trafficLimitBytes > 0
                            ? `${formatBytes(subParsed.trafficUsed ?? 0)} / ${formatBytes(subParsed.trafficLimitBytes)}`
                            : "Безлимит"}
                        </p>
                        {trafficPercent != null && <span className="text-sm font-semibold text-muted-foreground">{trafficPercent}%</span>}
                      </div>
                    </div>
                  </div>
                  {trafficPercent != null && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40 ring-1 ring-white/10 dark:bg-muted/20">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400/90 to-primary/90 motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out"
                        style={{ width: `${trafficPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </motion.section>

        {/* 2. Триал / выбор тарифа — только без активной подписки (при оплаченной подписке без ссылки блок не показываем) */}
        {!hasActiveSubscription && (
        <motion.section variants={miniItem} className="cabinet-mini-glass relative w-full max-w-full self-start overflow-hidden p-3.5 sm:p-4">
          <div
            className="cabinet-mini-glass__blob right-0 top-1/2 h-32 w-32 -translate-y-1/2 translate-x-1/4 rounded-full bg-gradient-to-l from-violet-500/16 to-transparent blur-2xl dark:from-violet-400/22"
            aria-hidden
          />
          <div className="cabinet-mini-glass__body">
          <h2 className="mb-3 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <div className="rounded-xl border border-white/30 bg-gradient-to-br from-primary/20 to-primary/5 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] ring-1 ring-primary/15 backdrop-blur-sm dark:border-white/10">
              <Wifi className="h-4 w-4 shrink-0 text-primary" />
            </div>
            Доступ к VPN
          </h2>
          {showTrial ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/25 to-green-600/10 text-green-600 shadow-[0_0_32px_-12px_rgba(34,197,94,0.45)] ring-1 ring-green-500/30 dark:text-green-400">
                <Gift className="h-6 w-6" />
              </div>
              <p className="text-[13px] leading-snug text-muted-foreground">
                Получите бесплатный доступ на {formatRuDays(trialDays)}.
              </p>
              <Button className="h-10 w-full gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-sm text-white shadow-[0_12px_36px_-10px_rgba(34,197,94,0.5)] transition-transform duration-300 hover:scale-[1.02] hover:from-green-500 hover:to-emerald-500 [&_svg]:self-center [&_span]:leading-none" onClick={activateTrial} disabled={trialLoading}>
                {trialLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Gift className="h-4 w-4 shrink-0" />}
                <span className="inline-flex items-center leading-none font-semibold">Активировать триал</span>
              </Button>
              {trialError && <p className="text-xs text-destructive break-words text-center">{trialError}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.1] to-transparent p-3 text-[13px] leading-snug text-primary shadow-[0_0_36px_-14px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 backdrop-blur-sm dark:from-primary/15">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Ссылка появится после оплаты. Вкладка «Тарифы».</p>
              </div>
              <Button className="h-10 w-full rounded-lg bg-gradient-to-r from-primary to-primary/88 text-sm shadow-[0_10px_32px_-10px_hsl(var(--primary)/0.45)] transition-transform duration-300 hover:scale-[1.02] [&_svg]:self-center [&_span]:leading-none" variant="default" asChild>
                <Link to="/cabinet/tariffs" className="inline-flex w-full items-center justify-center gap-2">
                  <span className="inline-flex items-center leading-none font-semibold">Выбрать тариф</span>
                </Link>
              </Button>
            </div>
          )}
          </div>
        </motion.section>
        )}

        {/* 3. Баланс */}
        <motion.section variants={miniItem} className="cabinet-mini-glass relative flex w-full max-w-full flex-col gap-2 self-start overflow-hidden p-3">
          <div
            className="cabinet-mini-glass__blob -left-14 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/14 to-transparent blur-2xl dark:from-amber-300/18"
            aria-hidden
          />
          <div className="cabinet-mini-glass__body flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border border-white/30 bg-gradient-to-br from-primary/20 to-primary/5 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] ring-1 ring-primary/15 backdrop-blur-sm dark:border-white/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Мой баланс</h2>
              <p className="mt-0.5 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-xl font-bold leading-none tracking-tight text-transparent tabular-nums">{formatMoney(client.balance, client.preferredCurrency)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/15 bg-background/50 p-2.5 shadow-sm backdrop-blur-md dark:border-white/[0.07]">
            <div className="min-w-0 flex flex-col pr-2">
              <Label className="text-xs font-semibold">Автопродление</Label>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {config?.yookassaRecurringEnabled
                  ? <>Сначала с баланса{client.yookassaPaymentMethodTitle ? <>, затем с карты <span className="font-medium">{client.yookassaPaymentMethodTitle}</span></> : ", затем с карты (если ранее оплачивали через ЮKassa)"}</>
                  : <>Автоматическое списание<br/>при окончании подписки</>
                }
              </span>
            </div>
            <Switch
              checked={client.autoRenewEnabled ?? false}
              disabled={autoRenewLoading}
              onCheckedChange={toggleAutoRenew}
            />
          </div>
          <Button className="h-10 w-full gap-1.5 rounded-lg bg-gradient-to-r from-primary/95 to-primary/80 text-sm text-primary-foreground shadow-[0_10px_32px_-10px_hsl(var(--primary)/0.45)] transition-transform duration-300 hover:scale-[1.02] [&_svg]:self-center [&_span]:leading-none" asChild>
            <Link to="/cabinet/profile#topup" className="inline-flex w-full items-center justify-center gap-1.5">
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span className="inline-flex items-center leading-none font-semibold">Пополнить баланс</span>
            </Link>
          </Button>
          </div>
        </motion.section>
        </motion.div>
      </motion.div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      {/* Hero + CTA */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-card/40 backdrop-blur-2xl border border-border/50 p-8 sm:p-10 shadow-xl"
      >
        {/* Декоративное свечение */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Добро пожаловать{client.email ? `, ${client.email.split("@")[0]}` : client.telegramUsername ? `, @${client.telegramUsername}` : ""}
            </h1>
            <p className="mt-3 text-[16px] text-muted-foreground max-w-xl leading-relaxed">
              {hasActiveSubscription
                ? "Ваша подписка активна. Подключитесь к VPN и наслаждайтесь свободным интернетом."
                : "Подключитесь к VPN — выберите удобный тариф и оплатите прямо на сайте."}
            </p>
            
            {(paymentMessage === "success" || paymentMessage === "success_topup" || paymentMessage === "success_tariff") && (
              <div className="mt-4 inline-flex items-center gap-2 bg-green-500/15 border border-green-500/30 px-4 py-2 rounded-xl text-green-700 dark:text-green-400 font-medium text-sm">
                <Check className="h-4 w-4" />
                {paymentMessage === "success_topup" ? "Баланс пополнен." : paymentMessage === "success_tariff" ? "Тариф активирован." : "Оплата прошла успешно."}
              </div>
            )}
            {paymentMessage === "failed" && (
              <div className="mt-4 inline-flex items-center gap-2 bg-destructive/15 border border-destructive/30 px-4 py-2 rounded-xl text-destructive font-medium text-sm">
                <AlertCircle className="h-4 w-4" />
                Оплата не прошла. Попробуйте снова.
              </div>
            )}
            {trialError && <p className="mt-3 text-sm text-destructive font-medium">{trialError}</p>}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 min-w-[240px]">
            {showTrial ? (
              <Button size="lg" className="w-full gap-2 shadow-xl bg-green-600 hover:bg-green-700 text-white rounded-xl h-14 hover:scale-105 transition-transform [&_svg]:self-center [&_span]:leading-none" onClick={activateTrial} disabled={trialLoading}>
                {trialLoading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Gift className="h-5 w-5 shrink-0" />}
                <span className="inline-flex items-center text-base font-medium leading-none">Бесплатный триал</span>
              </Button>
            ) : vpnUrl ? (
              <Button size="lg" className="w-full gap-2 shadow-xl rounded-xl h-14 hover:scale-105 transition-transform bg-primary text-primary-foreground [&_svg]:self-center [&_span]:leading-none" asChild>
                <Link to="/cabinet/subscribe" className="inline-flex items-center justify-center gap-2 leading-none">
                  <Wifi className="h-5 w-5 shrink-0" />
                  <span className="inline-flex items-center text-base font-medium leading-none">Настроить VPN</span>
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="default" className="w-full gap-2 shadow-xl rounded-xl h-14 hover:scale-105 transition-transform [&_svg]:self-center [&_span]:leading-none" asChild>
                <Link to="/cabinet/tariffs" className="inline-flex items-center justify-center gap-2 leading-none">
                  <Package className="h-5 w-5 shrink-0" />
                  <span className="inline-flex items-center text-base font-medium leading-none">Выбрать тариф</span>
                </Link>
              </Button>
            )}
            <Button variant="secondary" size="lg" className="w-full gap-2 rounded-xl h-14 hover:scale-105 transition-transform bg-background/50 hover:bg-background/80 border border-border/50 [&_svg]:self-center [&_span]:leading-none" asChild>
              <Link to="/cabinet/profile#topup" className="inline-flex items-center justify-center gap-2 leading-none">
                <PlusCircle className="h-5 w-5 shrink-0 text-foreground/70" />
                <span className="inline-flex items-center text-base font-medium leading-none">Пополнить баланс</span>
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Подписка / тариф */}
        <Card className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl text-foreground">
              <div className="p-2.5 bg-primary/20 rounded-xl">
                <Package className="h-6 w-6 text-primary" />
              </div>
              Моя Подписка
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : subscriptionError || !hasActiveSubscription ? (
              <NoSubscriptionState />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Активна
                  </span>
                  {daysLeft != null && (
                    <span className="text-sm font-semibold text-foreground bg-foreground/5 px-3 py-1.5 rounded-full border border-border/50 shadow-sm">
                      {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
                    </span>
                  )}
                  {subParsed.hwidDeviceLimit != null && subParsed.hwidDeviceLimit > 0 && deviceCount != null && (
                    <span className="text-sm font-semibold text-foreground bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 shadow-sm flex items-center gap-1.5">
                      📱 {deviceCount} / {subParsed.hwidDeviceLimit}
                    </span>
                  )}
                </div>
                {((tariffDisplayName ?? subParsed.productName) || client?.trialUsed) && (
                  <div className="flex items-center gap-4 bg-background/40 p-4 rounded-2xl border border-border/50 transition-colors hover:bg-background/60 shadow-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Тариф</p>
                      <p className="text-[15px] font-semibold truncate text-foreground">
                        {((tariffDisplayName ?? subParsed.productName?.trim() ?? "").trim()) || "Триал"}
                      </p>
                    </div>
                  </div>
                )}
                {subParsed.expireAt && (
                  <div className="flex items-center gap-4 bg-background/40 p-4 rounded-2xl border border-border/50 transition-colors hover:bg-background/60 shadow-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Действует до</p>
                      <p className="text-[15px] font-semibold text-foreground">
                        {formatDate(subParsed.expireAt)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="bg-background/40 p-4 rounded-2xl border border-border/50 space-y-3 transition-colors hover:bg-background/60 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Wifi className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Трафик</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[15px] font-semibold text-foreground">
                          {subParsed.trafficLimitBytes != null && subParsed.trafficLimitBytes > 0
                            ? `${formatBytes(subParsed.trafficUsed ?? 0)} / ${formatBytes(subParsed.trafficLimitBytes)}`
                            : "Безлимит"}
                        </p>
                        {trafficPercent != null && <span className="text-[13px] font-bold text-muted-foreground">{trafficPercent}%</span>}
                      </div>
                    </div>
                  </div>
                  {trafficPercent != null && (
                    <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out" style={{ width: `${trafficPercent}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Баланс + пополнение */}
        <Card className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl text-foreground">
              <div className="p-2.5 bg-primary/20 rounded-xl">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              Баланс
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-center text-center">
            <div>
              <p className="text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
                {formatMoney(client.balance, client.preferredCurrency)}
              </p>
              <p className="text-[15px] text-muted-foreground mt-3">На счету для продления тарифов</p>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-border/50 text-left">
              <div className="flex flex-col">
                <Label className="text-[15px] font-semibold">Автопродление</Label>
                <span className="text-sm text-muted-foreground mt-0.5">
                  {config?.yookassaRecurringEnabled
                    ? <>Сначала с баланса{client.yookassaPaymentMethodTitle ? <>, затем с карты <span className="font-medium">{client.yookassaPaymentMethodTitle}</span></> : ", затем с карты (если ранее оплачивали через ЮKassa)"}</>
                    : "Списание с баланса"
                  }
                </span>
              </div>
              <Switch
                checked={client.autoRenewEnabled ?? false}
                disabled={autoRenewLoading}
                onCheckedChange={toggleAutoRenew}
              />
            </div>

            <Button variant="default" size="lg" className="w-full gap-2 shadow-lg h-14 rounded-xl text-[16px] hover:scale-105 transition-transform [&_svg]:self-center [&_span]:leading-none" asChild>
              <Link to="/cabinet/profile#topup" className="inline-flex items-center justify-center gap-2 leading-none">
                <PlusCircle className="h-5 w-5 shrink-0" />
                <span className="inline-flex items-center leading-none">Пополнить баланс</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Справа от баланса: Рефералы или Подключение */}
        <Card className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl text-foreground">
              <div className="p-2.5 bg-primary/20 rounded-xl">
                {hasReferralLinks ? <Users className="h-6 w-6 text-primary" /> : <Wifi className="h-6 w-6 text-primary" />}
              </div>
              {hasReferralLinks ? "Рефералы" : "Подключение"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-2 flex flex-col justify-center h-[calc(100%-5rem)]">
            {hasReferralLinks ? (
              <>
                <p className="text-[15px] text-muted-foreground leading-relaxed">Делитесь ссылкой и получайте <strong className="text-foreground">бонус на баланс</strong> за каждого приглашенного друга!</p>
                {referralLinkSite && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Сайт</p>
                    <div className="flex items-center gap-2">
                      <code className="rounded-xl bg-background/50 border border-border/50 px-4 py-3 text-[15px] font-mono flex-1 truncate block text-foreground/80" title={referralLinkSite}>
                        {referralLinkSite}
                      </code>
                      <Button variant="secondary" size="icon" onClick={() => copyReferral("site")} className="shrink-0 h-12 w-12 rounded-xl hover:scale-105 transition-transform border border-border/50 bg-background/50" title="Копировать">
                        {referralCopied === "site" ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-foreground/70" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="pt-3">
                  <Button variant="outline" className="w-full rounded-xl h-12 text-[15px] bg-background/30 hover:bg-background/60 transition-colors border-border/50 [&_svg]:self-center [&_span]:leading-none" asChild>
                     <Link to="/cabinet/referral" className="inline-flex items-center justify-center gap-2 leading-none">
                       <span className="inline-flex items-center leading-none">Подробная статистика</span>
                       <ArrowRight className="h-4 w-4 shrink-0" />
                     </Link>
                  </Button>
                </div>
              </>
            ) : vpnUrl ? (
              <div className="flex flex-col h-full justify-between space-y-6">
                <p className="text-[15px] text-muted-foreground leading-relaxed">Ваша подписка готова к использованию. Перейдите к настройке приложения.</p>
                <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20 text-center">
                   <Wifi className="h-12 w-12 text-primary mx-auto mb-3 opacity-80" />
                   <p className="text-[15px] text-foreground font-medium">Всё готово к работе</p>
                </div>
                <Button variant="default" size="lg" className="w-full gap-2 rounded-xl shadow-lg h-14 text-[16px] hover:scale-105 transition-transform [&_svg]:self-center [&_span]:leading-none" asChild>
                  <Link to="/cabinet/subscribe" className="inline-flex items-center justify-center gap-2 leading-none">
                    <Wifi className="h-5 w-5 shrink-0" />
                    <span className="inline-flex items-center leading-none">Настроить VPN</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-center space-y-6">
                <div className="p-6 bg-background/30 rounded-2xl border border-border/50 text-center">
                   <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                   <p className="text-[15px] text-muted-foreground">Оплатите тариф, чтобы получить ссылку</p>
                </div>
                <Button variant="outline" size="lg" className="w-full rounded-xl h-14 text-[16px] bg-background/30 hover:bg-background/60 border-border/50 transition-colors [&_span]:leading-none" asChild>
                  <Link to="/cabinet/tariffs" className="inline-flex items-center justify-center leading-none">
                    <span className="inline-flex items-center leading-none">Выбрать тариф</span>
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
