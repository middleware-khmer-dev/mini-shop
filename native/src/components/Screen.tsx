import React from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Glass } from "./Glass";
import { NAV_HEIGHT, PILL_BOTTOM_SPACE, useNav } from "./nav-context";

type Props = {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** extra bottom space when a sticky action bar is shown */
  withActionBar?: boolean;
  contentClassName?: string;
};

/** Scrollable page: reports scroll to the nav (hide/show) and leaves room for it. */
export function Screen({ header, children, withActionBar, contentClassName = "" }: Props) {
  const { onScroll, wide } = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1" style={{ paddingTop: wide ? NAV_HEIGHT : 0 }}>
      {header}
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (withActionBar ? 170 : PILL_BOTTOM_SPACE + 40) + insets.bottom }}
      >
        <View className={`mx-auto w-full max-w-[1180px] px-4 md:px-10 ${contentClassName}`}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** Sticky bar (checkout / add to cart) that sits above the nav and drops down when it hides. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const { hidden, wide } = useNav();
  const insets = useSafeAreaInsets();
  const bottom = hidden.interpolate({ inputRange: [0, 1], outputRange: [wide ? 0 : PILL_BOTTOM_SPACE + insets.bottom, 0] });
  return (
    <Animated.View style={{ position: "absolute", left: 0, right: 0, zIndex: 40, bottom }}>
      <Glass strong className="flex-row items-center gap-3 border-x-0 px-4 pb-3 pt-3">
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
  return (
    <Glass dark intensity={60} className="rounded-b-3xl border-t-0" style={{ paddingTop: 14 + insets.top }}>
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
