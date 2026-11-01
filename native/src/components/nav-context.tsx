import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTelegram } from "@/lib/telegram";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Animated, NativeScrollEvent, NativeSyntheticEvent, Platform, useWindowDimensions } from "react-native";

type NavCtx = {
  /** 0 = nav visible, 1 = hidden (animated) */
  hidden: Animated.Value;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  wide: boolean;
};

const Ctx = createContext<NavCtx | null>(null);
export const NAV_HEIGHT = 64;
/** Space taken by the floating bottom bar (without the device bottom inset): 8 gap + 4 + 44 tab + 4 */
export const PILL_BOTTOM_SPACE = 60;

/** Bottom inset from the device (home indicator) or Telegram, whichever is larger */
export function useBottomInset() {
  const insets = useSafeAreaInsets();
  const tg = useTelegram();
  return Math.max(insets.bottom, tg.insets.bottom);
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= 900;
  const hidden = useRef(new Animated.Value(0)).current;
  const state = useRef({ lastY: 0, isHidden: false });

  const setHidden = useCallback(
    (h: boolean) => {
      if (state.current.isHidden === h) return;
      state.current.isHidden = h;
      Animated.timing(hidden, { toValue: h ? 1 : 0, duration: 280, useNativeDriver: false }).start();
    },
    [hidden],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = Math.max(0, e.nativeEvent.contentOffset.y);
      const dy = y - state.current.lastY;
      // Hide while scrolling down the page, show again when scrolling up
      if (Math.abs(dy) > 6) {
        setHidden(dy > 0 && y > 60);
        state.current.lastY = y;
      }
      if (y <= 60) setHidden(false);
    },
    [setHidden],
  );

  const path = usePathname();
  useEffect(() => {
    state.current.lastY = 0;
    setHidden(false);
  }, [path, setHidden]);

  const value = useMemo(() => ({ hidden, onScroll, wide }), [hidden, onScroll, wide]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Pages with one job (product / cart / checkout / success) have no bottom nav on phones. */
export const NAV_FREE_ROUTES = /^\/(product|cart|checkout|success)/;

export const useNav = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNav outside NavProvider");
  return c;
};
