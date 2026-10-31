import { usePathname, router } from "expo-router";
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

/** The SDK object also exists in plain browsers; only a non-empty platform/initData means real Telegram. */
const isRealTelegram = (tg?: WebApp) => !!tg && (!!tg.initData || (!!tg.platform && tg.platform !== "unknown"));

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
    const back = () => (router.canGoBack() ? router.back() : router.replace("/home"));
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
export function useMainButton(opts: { text: string; onPress: () => void; visible?: boolean; disabled?: boolean }) {
  const { inTelegram } = useTelegram();
  const { text, onPress, visible = true, disabled = false } = opts;
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
    if (disabled) mb.disable();
    else mb.enable();
    mb.show();
    mb.onClick(handler);
    return () => {
      mb.offClick(handler);
      mb.hide();
    };
  }, [inTelegram, text, visible, disabled]);

  return inTelegram && visible;
}
