import React, { useState } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTelegram } from "@/lib/telegram";
import { Glass } from "./Glass";
import { NAV_HEIGHT, PILL_BOTTOM_SPACE, useBottomInset, useNav } from "./nav-context";

type Props = {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** extra bottom space when a sticky action bar is shown */
  withActionBar?: boolean;
  contentClassName?: string;
};

/** Scrollable page: reports scroll to the nav (hide/show) and leaves room for it. */
export function Screen({ header, children, withActionBar, contentClassName = "" }: Props) {
  const { onScroll, wide, hidden } = useNav();
  const insets = useSafeAreaInsets();
  const tg = useTelegram();
  const [headerH, setHeaderH] = useState(0);
  const topPad = wide ? NAV_HEIGHT : header ? 0 : Math.max(insets.top, tg.insets.top);
  // Phone/Telegram: the header floats over the content and slides away with the nav
  const floating = !!header && !wide;
  const headerY = hidden.interpolate({ inputRange: [0, 1], outputRange: [0, -(headerH + 12)] });
  return (
    <View className="flex-1" style={{ paddingTop: topPad }}>
      {header ? (
        <Animated.View
          onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
          style={floating ? { position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, transform: [{ translateY: headerY }] } : undefined}
        >
          {header}
        </Animated.View>
      ) : null}
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: floating ? headerH : 0, paddingBottom: (withActionBar ? 170 : PILL_BOTTOM_SPACE + 40) + insets.bottom }}
      >
        <View className={`mx-auto w-full max-w-[1180px] px-4 md:px-10 ${contentClassName}`}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** Sticky bar (checkout / add to cart) that sits above the nav and drops down when it hides. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const { hidden, wide } = useNav();
  const bottomInset = useBottomInset();
  const bottom = hidden.interpolate({ inputRange: [0, 1], outputRange: [wide ? 0 : PILL_BOTTOM_SPACE + bottomInset, 0] });
  return (
    <Animated.View style={{ position: "absolute", left: 0, right: 0, zIndex: 40, bottom }}>
      <Glass solid className="flex-row items-center gap-3 border-x-0 px-4 pb-3 pt-3">
        <View className="mx-auto w-full max-w-[1180px] flex-row items-center gap-3">{children}</View>
      </Glass>
    </Animated.View>
  );
}

export function Header({
  title,
  left,
  right,
}: {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const tg = useTelegram();
  // Telegram fullscreen draws Close/menu over the app: keep the header content below them
  const top = Math.max(insets.top, tg.insets.top);
  return (
    <Glass dark intensity={60} className="rounded-b-3xl border-t-0" style={{ paddingTop: (tg.inTelegram ? 4 : 14) + top }}>
      <View className="mx-auto w-full max-w-[1180px] flex-row items-center justify-between gap-3 px-4 pb-4 md:px-10">
        {left}
        {title ? <View className="flex-1 items-center"><TitleText>{title}</TitleText></View> : <View className="flex-1" />}
        {right}
      </View>
    </Glass>
  );
}

function TitleText({ children }: { children: React.ReactNode }) {
  return <Text className="text-[17px] font-bold text-white">{children}</Text>;
}
