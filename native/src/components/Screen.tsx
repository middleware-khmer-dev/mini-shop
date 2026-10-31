import React from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTelegram } from "@/lib/telegram";
import { Glass } from "./Glass";
import { NAV_HEIGHT, PILL_BOTTOM_SPACE, useBottomInset, useNav } from "./nav-context";

const PILL_H = 34;

/**
 * Space taken at the top of a page. Inside Telegram (fullscreen) Telegram draws its Back / Close /
 * menu buttons in a row at the top; the page title sits in that same row, centered between them.
 */
function useTopArea(hasTitle: boolean) {
  const insets = useSafeAreaInsets();
  const { insets: tg } = useTelegram();
  if (tg.controlsH > 0) {
    return { pillTop: tg.deviceTop + Math.max(0, (tg.controlsH - PILL_H) / 2), contentTop: tg.deviceTop + tg.controlsH + 10 };
  }
  const top = Math.max(insets.top, tg.deviceTop) + 10;
  // normal (non-fullscreen) mode: Telegram's own header sits above; only reserve room for the label when there is one
  return { pillTop: top, contentTop: hasTitle ? top + PILL_H + 10 : top };
}

type Props = {
  /** page title, shown as a small glass label at the top, centered */
  title?: string;
  children: React.ReactNode;
  /** extra bottom space when a sticky action bar is shown */
  withActionBar?: boolean;
  contentClassName?: string;
};

/** Scrollable page: reports scroll to the nav (hide/show) and leaves room for it. */
export function Screen({ title, children, withActionBar, contentClassName = "" }: Props) {
  const { onScroll, wide, hidden } = useNav();
  const insets = useSafeAreaInsets();
  const { pillTop, contentTop } = useTopArea(!!title);
  const pillY = hidden.interpolate({ inputRange: [0, 1], outputRange: [0, -(pillTop + PILL_H + 16)] });

  const pill = title ? (
    <Glass strong intensity={60} className="h-[34px] max-w-[210px] justify-center rounded-full px-4">
      <Text numberOfLines={1} className="text-center text-[14px] font-bold text-ink">{title}</Text>
    </Glass>
  ) : null;

  return (
    <View className="flex-1" style={{ paddingTop: wide ? NAV_HEIGHT : 0 }}>
      {pill && !wide ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", top: pillTop, left: 0, right: 0, zIndex: 30, alignItems: "center", transform: [{ translateY: pillY }] }}
        >
          {pill}
        </Animated.View>
      ) : null}
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: wide ? 0 : contentTop, paddingBottom: (withActionBar ? 110 : PILL_BOTTOM_SPACE + 40) + insets.bottom }}
      >
        {pill && wide ? <View className="items-center pt-4">{pill}</View> : null}
        <View className={`mx-auto w-full max-w-[1180px] px-4 md:px-10 ${contentClassName}`}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** Sticky bar (pay / add to cart). These pages have no bottom nav, so it sits flush at the bottom. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const { wide } = useNav();
  const bottomInset = useBottomInset();
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 40 }}>
      <Glass solid className="flex-row items-center gap-3 border-x-0 px-4 pt-3" style={{ paddingBottom: 12 + (wide ? 0 : bottomInset) }}>
        <View className="mx-auto w-full max-w-[1180px] flex-row items-center gap-3">{children}</View>
      </Glass>
    </View>
  );
}
