import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

type Insets = { top: number; bottom: number };
type TgCtx = { inTelegram: boolean; insets: Insets };

const Ctx = createContext<TgCtx>({ inTelegram: false, insets: { top: 0, bottom: 0 } });

type WebApp = {
  ready: () => void;
  expand: () => void;
  safeAreaInset?: { top?: number; bottom?: number };
  contentSafeAreaInset?: { top?: number; bottom?: number };
  onEvent: (e: string, cb: () => void) => void;
  offEvent: (e: string, cb: () => void) => void;
};

const getWebApp = (): WebApp | undefined =>
  Platform.OS === "web" ? (globalThis as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp : undefined;

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
        inTelegram: true,
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
