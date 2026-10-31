import { usePathname } from "expo-router";
import { goBack } from "@/lib/nav";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

type Insets = { top: number; bottom: number };
/** `inTelegram`: running inside the real Telegram client (not a normal browser that merely loaded the SDK) */
type TgCtx = { inTelegram: boolean; insets: Insets };

const Ctx = createContext<TgCtx>({ inTelegram: false, insets: { top: 0, bottom: 0 } });

type Btn = {
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
};
type MainBtn = Btn & {
  setText: (t: string) => void;
  setParams: (p: { color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  enable: () => void;
  disable: () => void;
  showProgress?: (leaveActive?: boolean) => void;
  hideProgress?: () => void;
};
type WebApp = {
  initData?: string;
  platform?: string;
  ready: () => void;
  expand: () => void;
  safeAreaInset?: { top?: number; bottom?: number };
  contentSafeAreaInset?: { top?: number; bottom?: number };
  onEvent: (e: string, cb: () => void) => void;
  offEvent: (e: string, cb: () => void) => void;
  BackButton?: Btn;
  MainButton?: MainBtn;
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy") => void; notificationOccurred: (s: "success" | "error" | "warning") => void };
};

const getWebApp = (): WebApp | undefined =>
  Platform.OS === "web" ? (globalThis as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp : undefined;

/**
 * Telegram passes its launch data in the URL hash (#tgWebAppData=...&tgWebAppPlatform=...). The SDK
 * script is loaded after the app starts, and the router rewrites the URL (/ to /home) by then, so the
 * hash would be gone and the SDK would report platform "unknown". Capture it here, when this module
 * is first evaluated (before any routing), and store it where the SDK looks for it.
 */
const LAUNCHED_FROM_TELEGRAM = (() => {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    const hash = window.location.hash.replace(/^#/, "");
    const key = "__telegram__initParams";
    if (/tgWebApp(Data|Platform|Version)=/.test(hash)) {
      const params: Record<string, string> = {};
      for (const part of hash.split("&")) {
        const i = part.indexOf("=");
        if (i > 0) params[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1));
      }
      window.sessionStorage.setItem(key, JSON.stringify(params));
      return true;
    }
    return !!window.sessionStorage.getItem(key) || !!(window as unknown as { TelegramWebviewProxy?: unknown }).TelegramWebviewProxy;
  } catch {
    return false;
  }
})();

/** The SDK object also exists in plain browsers; real Telegram = launched with Telegram's launch data. */
const isRealTelegram = (tg?: WebApp) =>
  !!tg && (LAUNCHED_FROM_TELEGRAM || !!tg.initData || (!!tg.platform && tg.platform !== "unknown"));

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || getWebApp()) return resolve();
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // not in Telegram / blocked: carry on
    document.head.appendChild(s);
  });
}

/**
 * Loads Telegram's WebApp SDK on web and exposes the insets taken by Telegram's own
 * controls (Close / menu, shown over the app in fullscreen) so headers can sit below them.
 */
export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TgCtx>({ inTelegram: false, insets: { top: 0, bottom: 0 } });

  useEffect(() => {
    let tg: WebApp | undefined;
    const read = () => {
      if (!tg) return;
      const sa = tg.safeAreaInset ?? {};
      const ca = tg.contentSafeAreaInset ?? {};
      setState({
        inTelegram: isRealTelegram(tg),
        insets: { top: (sa.top ?? 0) + (ca.top ?? 0), bottom: (sa.bottom ?? 0) + (ca.bottom ?? 0) },
      });
    };
    loadScript().then(() => {
      tg = getWebApp();
      if (!tg) return;
      tg.ready();
      tg.expand();
      read();
      for (const e of ["safeAreaChanged", "contentSafeAreaChanged", "viewportChanged"]) tg.onEvent(e, read);
    });
    return () => {
      if (!tg) return;
      for (const e of ["safeAreaChanged", "contentSafeAreaChanged", "viewportChanged"]) tg.offEvent(e, read);
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useTelegram = () => useContext(Ctx);

/** Light tap feedback inside Telegram; no-op elsewhere. */
export function haptic(style: "light" | "medium" | "heavy" = "light") {
  const tg = getWebApp();
  if (isRealTelegram(tg)) tg?.HapticFeedback?.impactOccurred(style);
}

/**
 * Telegram's own Back button: shown on every page except home, goes back (or to home).
 * Mount once, inside the router.
 */
export function TelegramBackButton() {
  const { inTelegram } = useTelegram();
  const path = usePathname();
  const atRoot = path === "/" || path === "/home";

  useEffect(() => {
    const tg = getWebApp();
    if (!inTelegram || !tg?.BackButton) return;
    const back = () => goBack(path);
    if (atRoot) {
      tg.BackButton.hide();
      return;
    }
    tg.BackButton.show();
    tg.BackButton.onClick(back);
    return () => {
      tg.BackButton?.offClick(back);
    };
  }, [inTelegram, atRoot, path]);

  return null;
}

/**
 * Telegram's Main button (big button at the bottom of the Mini App). Returns true when it is
 * in use, so the screen can hide its own in-page equivalent.
 */
export function useMainButton(opts: { text: string; onPress: () => void; visible?: boolean; disabled?: boolean; loading?: boolean }) {
  const { inTelegram } = useTelegram();
  const { text, onPress, visible = true, disabled = false, loading = false } = opts;
  const pressRef = useRef(onPress);
  pressRef.current = onPress;

  useEffect(() => {
    const tg = getWebApp();
    const mb = tg?.MainButton;
    if (!inTelegram || !mb) return;
    if (!visible) {
      mb.hide();
      return;
    }
    const handler = () => pressRef.current();
    mb.setParams({ color: "#14141f", text_color: "#ffffff" });
    mb.setText(text);
    if (disabled || loading) mb.disable();
    else mb.enable();
    // spinner on the button while the order is being placed (also blocks double taps)
    if (loading) mb.showProgress?.(true);
    else mb.hideProgress?.();
    mb.show();
    mb.onClick(handler);
    return () => {
      mb.offClick(handler);
      mb.hideProgress?.();
      mb.hide();
    };
  }, [inTelegram, text, visible, disabled, loading]);

  return inTelegram && visible;
}
