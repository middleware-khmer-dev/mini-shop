import React, { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { Animated, NativeScrollEvent, NativeSyntheticEvent, Platform, useWindowDimensions } from "react-native";

type NavCtx = {
  /** 0 = nav visible, 1 = hidden (animated) */
  hidden: Animated.Value;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  wide: boolean;
};

const Ctx = createContext<NavCtx | null>(null);
export const NAV_HEIGHT = 64;
export const PILL_BOTTOM_SPACE = 98;

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

  const value = useMemo(() => ({ hidden, onScroll, wide }), [hidden, onScroll, wide]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useNav = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNav outside NavProvider");
  return c;
};
