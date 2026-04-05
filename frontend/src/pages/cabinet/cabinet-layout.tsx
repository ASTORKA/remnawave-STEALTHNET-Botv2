import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth";
import { CabinetConfigProvider, useCabinetConfig } from "@/contexts/cabinet-config";
import { createContext, useContext } from "react";
import { useIsMiniapp } from "@/hooks/use-is-miniapp";
import { useTelegramMiniappChrome } from "@/hooks/use-telegram-miniapp-chrome";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { GlassSelect } from "@/components/ui/glass-select";
import { LayoutDashboard, Package, User, LogOut, Shield, Users, Sun, Moon, PlusCircle, Globe, KeyRound, MessageSquare, Palette, Monitor, Check, Loader2, Settings, Layers, MoreHorizontal, ChevronDown, Wallet } from "lucide-react";
import { useTheme, ACCENT_PALETTES, type ThemeMode, type ThemeAccent } from "@/contexts/theme";
import { cn } from "@/lib/utils";
import { FloatingChat } from "@/components/floating-chat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase() === "RUB" ? "RUB" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function AnalyticsScripts() {
  useEffect(() => {
    api.getPublicConfig().then((c) => {
      if (c.googleAnalyticsId?.trim()) {
        const id = c.googleAnalyticsId.trim();
        if (document.getElementById("ga4-script")) return;
        const script = document.createElement("script");
        script.id = "ga4-script";
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        document.head.appendChild(script);
        const init = document.createElement("script");
        init.id = "ga4-init";
        init.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
        document.head.appendChild(init);
      }
      if (c.yandexMetrikaId?.trim()) {
        const id = c.yandexMetrikaId.trim();
        const ymId = /^\d+$/.test(id) ? id : "0";
        if (document.getElementById("ym-script")) return;
        const script = document.createElement("script");
        script.id = "ym-script";
        script.async = true;
        script.textContent = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");ym(${ymId}, "init", {clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;
        document.head.appendChild(script);
      }
    }).catch(() => { });
  }, []);
  return null;
}

const IsMiniappContext = createContext(false);
export function useCabinetMiniapp() {
  return useContext(IsMiniappContext);
}

/** Экран ввода кода 2FA после успешной проверки пароля или Telegram */
function Client2FAStepScreen() {
  const { state, submit2FACode, clearPending2FA } = useClientAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!state.pending2FAToken || code.trim().length !== 6) {
        setError("Введите 6-значный код из приложения");
        return;
      }
      setError(null);
      setLoading(true);
      try {
        await submit2FACode(code.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неверный код");
      } finally {
        setLoading(false);
      }
    },
    [state.pending2FAToken, code, submit2FACode]
  );

  if (!state.pending2FAToken) return null;

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-background p-4 sm:p-8 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] min-w-0">
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10 dark:border-white/5 bg-[hsl(var(--card)/0.85)] backdrop-blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-6 shadow-inner border border-primary/20">
            <KeyRound className="h-8 w-8" />
          </div>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Код из приложения</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px]">Введите 6-значный код двухфакторной аутентификации для входа.</p>
          </div>
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="relative w-full">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000 000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full h-16 text-center text-3xl tracking-[0.3em] font-mono font-bold rounded-2xl border border-primary/20 bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 text-foreground transition-all"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20" disabled={loading || code.trim().length !== 6}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Подтвердить код
              </Button>
              <Button type="button" variant="ghost" className="w-full h-10 rounded-xl text-muted-foreground" disabled={loading} onClick={clearPending2FA}>
                Отмена
              </Button>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive text-center animate-in fade-in">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

const ALL_NAV_ITEMS = [
  { to: "/cabinet/dashboard", label: "Главная", icon: LayoutDashboard },
  { to: "/cabinet/tariffs", label: "Тарифы", icon: Package },
  { to: "/cabinet/extra-options", label: "Опции", icon: PlusCircle },
  { to: "/cabinet/referral", label: "Рефералы", icon: Users },
  { to: "/cabinet/proxy", label: "Прокси", icon: Globe },
  { to: "/cabinet/singbox", label: "Доступы", icon: KeyRound },
  { to: "/cabinet/tickets", label: "Тикеты", icon: MessageSquare },
  { to: "/cabinet/profile", label: "Профиль", icon: User },
  { to: "/cabinet/custom-build", label: "Гибкий тариф", icon: Layers },
];

const MODE_OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Светлая" },
  { value: "dark", icon: Moon, label: "Тёмная" },
  { value: "system", icon: Monitor, label: "Система" },
];

function ThemePopover() {
  const [show, setShow] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { config: themeConfig, setMode, setAccent, resolvedMode, allowUserThemeChange } = useTheme();

  useEffect(() => {
    if (!show) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    // defer to next tick so the opening click doesn't immediately close
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClick); };
  }, [show]);

  // Если смена темы запрещена — просто кнопка солнышко/луна без дропдауна
  if (!allowUserThemeChange) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 bg-background/20 hover:bg-background/40 transition-all duration-300"
        onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
      >
        <span className="relative h-4 w-4">
          <Sun className={cn("absolute inset-0 h-4 w-4 transition-all duration-500", resolvedMode === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
          <Moon className={cn("absolute inset-0 h-4 w-4 transition-all duration-500", resolvedMode === "light" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0")} />
        </span>
      </Button>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-background/20 hover:bg-background/40" onClick={() => setShow(!show)}>
        <Palette className="h-3.5 w-3.5" />
      </Button>
      <div
        className={cn(
          "absolute -right-2 sm:right-0 top-full z-50 mt-3 w-[calc(100vw-2rem)] sm:w-[320px] max-w-[320px] rounded-[2rem] border border-white/40 dark:border-white/10 bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-[32px] p-5 shadow-[0_10px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_60px_rgba(0,0,0,0.5)] transition-all duration-300 origin-top-right",
          show
            ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
            : "opacity-0 scale-95 pointer-events-none -translate-y-2"
        )}
      >
        <div className="mb-5">
          <h4 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Тема</h4>
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/50">
            {MODE_OPTIONS.map((opt) => {
              const isActive = themeConfig.mode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all duration-300",
                    isActive
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {allowUserThemeChange && (
          <div>
            <h4 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Цветовой акцент</h4>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(ACCENT_PALETTES) as [ThemeAccent, typeof ACCENT_PALETTES["default"]][]).map(([key, palette]) => {
                const isActive = themeConfig.accent === key;
                return (
                  <button
                    key={key}
                    onClick={() => setAccent(key)}
                    className={cn(
                      "group flex flex-col items-center gap-2 rounded-xl p-2 transition-all duration-300",
                      isActive ? "bg-primary/10" : "hover:bg-muted/60"
                    )}
                  >
                    <div
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-transform duration-300",
                        isActive ? "scale-110 ring-4 ring-primary/20" : "group-hover:scale-110"
                      )}
                      style={{ backgroundColor: palette.swatch }}
                    >
                      {isActive && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium tracking-tight truncate w-full text-center transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {palette.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPopover() {
  const [show, setShow] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { state, refreshProfile } = useClientAuth();

  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>([]);
  const [preferredLang, setPreferredLang] = useState(state.client?.preferredLang ?? "ru");
  const [preferredCurrency, setPreferredCurrency] = useState(state.client?.preferredCurrency ?? "usd");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) {
      if (state.client) {
        setPreferredLang(state.client.preferredLang);
        setPreferredCurrency(state.client.preferredCurrency);
      }
      return;
    }

    api.getPublicConfig()
      .then((c) => {
        setActiveLanguages(c.activeLanguages?.length ? c.activeLanguages : ["ru", "en"]);
        setActiveCurrencies(c.activeCurrencies?.length ? c.activeCurrencies : ["usd", "rub"]);
      })
      .catch(() => { });

    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClick); };
  }, [show, state.client]);

  async function handleSave() {
    if (!state.token) return;
    setSaving(true);
    try {
      await api.clientUpdateProfile(state.token, { preferredLang, preferredCurrency });
      await refreshProfile();
      setShow(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const langs = activeLanguages.length ? activeLanguages : ["ru", "en"];
  const currencies = activeCurrencies.length ? activeCurrencies : ["usd", "rub"];

  return (
    <div className="relative" ref={popoverRef}>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2 bg-background/20 hover:bg-background/40" onClick={() => setShow(!show)}>
        <Settings className="h-3.5 w-3.5" />
      </Button>
      <div
        className={cn(
          "absolute -right-2 sm:right-0 top-full z-50 mt-3 w-[calc(100vw-2rem)] sm:w-[260px] max-w-[260px] rounded-[2rem] border border-white/40 dark:border-white/10 bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-[32px] p-5 shadow-[0_10px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_60px_rgba(0,0,0,0.5)] transition-all duration-300 origin-top-right",
          show ? "opacity-100 scale-100 pointer-events-auto translate-y-0" : "opacity-0 scale-95 pointer-events-none -translate-y-2"
        )}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold tracking-tight text-foreground truncate">Настройки</h4>
            <p className="text-[10px] text-muted-foreground mt-[1px] uppercase tracking-wider font-semibold truncate">Язык и валюта</p>
          </div>
        </div>

        <div className="space-y-4 mb-5">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium pl-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Язык</label>
            <GlassSelect
              value={preferredLang}
              onChange={(v) => setPreferredLang(v)}
              options={langs.map((l) => ({ value: l, label: l === "ru" ? "Русский" : l === "en" ? "English" : l.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium pl-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Валюта</label>
            <GlassSelect
              value={preferredCurrency}
              onChange={(v) => setPreferredCurrency(v)}
              options={currencies.map((c) => ({ value: c, label: c.toUpperCase() }))}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-10 rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Сохранить
        </Button>
      </div>
    </div>
  );
}

function resolveNavItems(config: { sellOptionsEnabled?: boolean; showProxyEnabled?: boolean; showSingboxEnabled?: boolean; ticketsEnabled?: boolean; customBuildConfig?: { enabled: true } | null } | null) {
  let items = ALL_NAV_ITEMS;
  // Убираем вкладку тикетов, так как теперь поддержка внутри виджета чата
  items = items.filter((i) => i.to !== "/cabinet/tickets");

  if (!config?.customBuildConfig) items = items.filter((i) => i.to !== "/cabinet/custom-build");
  if (!config?.sellOptionsEnabled) items = items.filter((i) => i.to !== "/cabinet/extra-options");
  if (!config?.showProxyEnabled) items = items.filter((i) => i.to !== "/cabinet/proxy");
  if (!config?.showSingboxEnabled) items = items.filter((i) => i.to !== "/cabinet/singbox");

  return items;
}

const MAX_VISIBLE_NAV = 4;
const MAX_VISIBLE_DESKTOP = 10;

function MobileCabinetShell() {
  const location = useLocation();
  const { state, refreshProfile } = useClientAuth();
  const { setConfig } = useTheme();
  const config = useCabinetConfig();
  const navItems = useMemo(() => resolveNavItems(config), [config?.sellOptionsEnabled, config?.showProxyEnabled, config?.showSingboxEnabled, config?.ticketsEnabled, config?.customBuildConfig]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const visibleItems = navItems.slice(0, MAX_VISIBLE_NAV);
  const hasMore = navItems.length > MAX_VISIBLE_NAV;
  const isMiniapp = useIsMiniapp();

  useEffect(() => {
    setConfig({ mode: "dark", accent: "default" });
  }, [setConfig]);

  useEffect(() => {
    if (state.token) refreshProfile().catch(() => { });
  }, [state.token, refreshProfile]);

  return (
    <div
      className={cn(
        "cabinet-native-font relative flex min-h-svh min-w-0 flex-col overflow-x-hidden bg-background pb-[calc(4.65rem+env(safe-area-inset-bottom))]",
        isMiniapp && "selection:bg-primary/20"
      )}
    >
      <div className="cabinet-ambient" aria-hidden>
        <div className="cabinet-ambient__base" />
        <div className="cabinet-ambient__aurora" />
        <div className="cabinet-ambient__blob cabinet-ambient__blob--a" />
        <div className="cabinet-ambient__blob cabinet-ambient__blob--b" />
        <div className="cabinet-ambient__blob cabinet-ambient__blob--c" />
        <div className="cabinet-ambient__shimmer" />
        <div className="cabinet-ambient__liquid" />
        <div className="cabinet-ambient__grain" />
        <div className="cabinet-ambient__vignette" />
      </div>
      <FloatingChat />
      <main
        className={cn(
          "mx-auto flex w-full min-w-0 flex-1 flex-col items-stretch px-4 pb-2 transition-all duration-300 sm:px-5",
          isMiniapp ? "cabinet-tg-main-pad max-w-lg sm:mx-auto" : "max-w-7xl pt-[max(0.75rem,env(safe-area-inset-top))]"
        )}
      >
        <Outlet />
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-5">
        <div className="cabinet-mini-dock cabinet-liquid-dock pointer-events-auto relative z-10 mx-auto flex min-h-[3.35rem] w-full max-w-lg items-center gap-0.5 rounded-full px-1.5 py-1 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]">
          {visibleItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative z-[1] flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full py-1 transition-all duration-300",
                  active ? "text-primary" : "text-muted-foreground active:scale-[0.97] hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                    active
                      ? "bg-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_0_20px_-4px_hsl(var(--primary)/0.45)] ring-1 ring-white/15"
                      : "ring-1 ring-transparent hover:bg-white/[0.06] hover:ring-white/10"
                  )}
                >
                  <Icon className={cn("h-[20px] w-[20px] transition-transform duration-300", active && "scale-105")} />
                </span>
                <span className="w-full truncate px-0.5 text-center text-[9px] font-semibold leading-none tracking-tight">{label}</span>
              </Link>
            );
          })}
          {hasMore && (
            <button
              type="button"
              onClick={() => setMoreMenuOpen(true)}
              className="relative z-[1] flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full py-1 text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]"
              aria-label="Ещё"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-transparent hover:bg-white/[0.06] hover:ring-white/10">
                <MoreHorizontal className="h-[20px] w-[20px] shrink-0" />
              </span>
              <span className="w-full truncate px-0.5 text-center text-[9px] font-semibold leading-none">Ещё</span>
            </button>
          )}
        </div>
      </nav>

      <Dialog open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <DialogContent
          className="max-w-sm gap-0 overflow-hidden rounded-[1.35rem] border-white/20 bg-background/92 p-0 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-background/90 dark:shadow-[0_28px_90px_-28px_rgba(0,0,0,0.65)] sm:rounded-[1.35rem]"
          showCloseButton={true}
        >
          <DialogHeader className="border-b border-white/15 bg-gradient-to-r from-primary/[0.08] via-transparent to-violet-500/[0.07] px-5 py-4 text-left dark:border-white/[0.06]">
            <DialogTitle className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
              Меню
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[min(70vh,28rem)] gap-1 overflow-y-auto p-2.5">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[15px] transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-primary/18 to-primary/8 font-semibold text-primary shadow-[0_0_28px_-12px_hsl(var(--primary)/0.35)]"
                      : "hover:bg-white/10 dark:hover:bg-white/[0.06]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      active
                        ? "bg-primary/20 text-primary ring-1 ring-primary/25"
                        : "bg-muted/40 text-muted-foreground ring-1 ring-white/10 dark:bg-white/[0.06]"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

function CabinetShell() {
  const location = useLocation();
  const { state, logout, refreshProfile } = useClientAuth();
  const config = useCabinetConfig();
  const navItems = useMemo(() => resolveNavItems(config), [config?.sellOptionsEnabled, config?.showProxyEnabled, config?.showSingboxEnabled, config?.ticketsEnabled, config?.customBuildConfig]);
  const isMiniapp = useIsMiniapp();
  const isMobile = useIsMobile();
  const [logoError, setLogoError] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const visibleNav = navItems.slice(0, MAX_VISIBLE_DESKTOP);
  const moreNav = navItems.slice(MAX_VISIBLE_DESKTOP);

  useEffect(() => { setLogoError(false); }, [config?.logo]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  useEffect(() => {
    if (state.token) refreshProfile().catch(() => { });
  }, [state.token, refreshProfile]);
  const serviceName = config?.serviceName ?? "";
  const logo = config?.logo && !logoError ? config.logo : null;
  const headerBalance = state.client ? formatMoney(state.client.balance, state.client.preferredCurrency) : null;

  if (isMiniapp || isMobile) {
    return <MobileCabinetShell />;
  }

  return (
    <div className="min-h-svh flex flex-col bg-transparent">
      <FloatingChat />
      <header className="sticky top-0 z-50 border-b border-border shadow-sm transition-all duration-300">
        <div className="absolute inset-0 bg-card/40 backdrop-blur-xl -z-10 pointer-events-none" />
        <div className="relative w-full max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link to="/cabinet/dashboard" className="flex items-center gap-2.5 font-semibold text-lg tracking-tight shrink-0 hover:opacity-80 transition-opacity">
            {logo ? (
              <span className="flex items-center justify-center h-9 px-2 rounded-lg dark:bg-transparent bg-zinc-900 shrink-0">
                <img src={logo} alt="" className="h-6 max-w-[110px] object-contain" onError={() => setLogoError(true)} />
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary shadow-sm">
                <Shield className="h-5 w-5" />
              </span>
            )}
            {serviceName ? <span className="hidden sm:inline truncate">{serviceName}</span> : null}
          </Link>
          <nav className="flex items-center gap-1 flex-wrap justify-center flex-1">
            {visibleNav.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "inline-flex items-center gap-2 whitespace-nowrap transition-all duration-300",
                      active ? "bg-primary/20 hover:bg-primary/30 text-primary shadow-sm scale-105" : "hover:scale-105 hover:bg-background/40"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Button>
                </Link>
              );
            })}
            {moreNav.length > 0 && (
              <div className="relative inline-block" ref={moreRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "inline-flex items-center gap-2 whitespace-nowrap transition-all duration-300 hover:scale-105 hover:bg-background/40",
                    moreNav.some((i) => location.pathname === i.to) ? "bg-primary/20 text-primary" : ""
                  )}
                  onClick={() => setMoreOpen(!moreOpen)}
                >
                  Ещё
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", moreOpen && "rotate-180")} />
                </Button>
                {moreOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-border bg-card py-1.5 shadow-lg">
                    {moreNav.map(({ to, label, icon: Icon }) => {
                      const active = location.pathname === to;
                      return (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                            active ? "bg-primary/20 text-primary" : "hover:bg-muted/60"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <ThemePopover />
            <SettingsPopover />
            <div className="hidden lg:flex h-9 items-center gap-3 rounded-full border border-border/60 bg-background/35 px-4 shadow-sm backdrop-blur-xl transition-all hover:bg-background/50">
              <span className="max-w-[120px] xl:max-w-[160px] truncate text-sm font-medium text-muted-foreground" title={state.client?.email?.trim() || (state.client?.telegramUsername ? `@${state.client.telegramUsername}` : "")}>
                {state.client?.email?.trim() ? state.client.email : state.client?.telegramUsername ? `@${state.client.telegramUsername}` : "—"}
              </span>
              <div className="w-[1px] h-4 bg-border/80" />
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground/90">
                <Wallet className="h-4 w-4 text-primary" />
                <span>{headerBalance ?? "—"}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="group h-9 rounded-full border-border/60 bg-background/35 p-0 shadow-sm backdrop-blur-xl transition-all duration-300 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
              asChild
            >
              <Link to="/cabinet/login" onClick={() => logout()} className="flex h-full items-center">
                <div className="flex h-full w-9 shrink-0 items-center justify-center">
                  <LogOut className="h-[18px] w-[18px]" />
                </div>
                <div className="grid grid-cols-[0fr] opacity-0 transition-all duration-300 group-hover:grid-cols-[1fr] group-hover:opacity-100">
                  <span className="overflow-hidden whitespace-nowrap text-sm font-medium">
                    <span className="pr-4">Выйти</span>
                  </span>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}

export function CabinetLayout() {
  const location = useLocation();
  const { state } = useClientAuth();
  const isAuthPage = location.pathname === "/cabinet/login" || location.pathname === "/cabinet/register";
  const isLoggedIn = Boolean(state.token);
  const needs2FA = !isLoggedIn && Boolean(state.pending2FAToken);
  const inTelegramWebApp =
    typeof window !== "undefined" &&
    Boolean((window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData);
  useTelegramMiniappChrome(inTelegramWebApp && location.pathname.startsWith("/cabinet"));

  return (
    <>
      <AnalyticsScripts />
      {needs2FA ? (
        <Client2FAStepScreen />
      ) : isAuthPage || !isLoggedIn ? (
        <Outlet />
      ) : (
        <CabinetConfigProvider>
          <CabinetShellWithMiniapp />
        </CabinetConfigProvider>
      )}
    </>
  );
}

function CabinetShellWithMiniapp() {
  const isMiniapp = useIsMiniapp();
  const isMobile = useIsMobile();
  return (
    <IsMiniappContext.Provider value={isMiniapp || isMobile}>
      <CabinetShell />
    </IsMiniappContext.Provider>
  );
}
