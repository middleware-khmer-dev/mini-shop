import { Link, usePathname } from "expo-router";
import React from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/lib/cart";
import { Glass } from "./Glass";
import { Icon, IconName } from "./Icon";
import { NAV_HEIGHT, useNav } from "./nav-context";

const TABS: { key: string; label: string; href: string; icon: IconName; match: string[] }[] = [
  { key: "home", label: "ទំព័រដើម", href: "/home", icon: "home", match: ["/home"] },
  { key: "catalog", label: "កាតាឡុក", href: "/catalog", icon: "grid", match: ["/catalog", "/product"] },
  { key: "cart", label: "កន្ត្រក", href: "/cart", icon: "cart", match: ["/cart", "/checkout", "/success"] },
  { key: "profile", label: "គណនី", href: "/profile", icon: "user", match: ["/profile"] },
];

/**
 * Phone: round (50px) icon-only pill floating at the bottom; slides away on scroll down.
 * Wide web (desktop): navigation bar pinned to the top, with labels.
 */
export function PillNav() {
  const path = usePathname();
  const { hidden, wide } = useNav();
  const { count } = useCart();
  const insets = useSafeAreaInsets();
  const activeKey = TABS.find((t) => t.match.some((m) => path.startsWith(m)))?.key;

  const badge = (n: number) =>
    n > 0 ? (
      <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1">
        <Text className="text-[9px] font-extrabold text-white">{n}</Text>
      </View>
    ) : null;

  if (wide) {
    return (
      <Glass strong className="absolute inset-x-0 top-0 z-50 flex-row items-center border-x-0 border-t-0 px-10" style={{ height: NAV_HEIGHT }}>
        <Link href="/home" className="mr-auto text-lg font-extrabold text-ink">
          🛍️ Mini Shop
        </Link>
        {TABS.map((t) => {
          const active = t.key === activeKey;
          return (
            <Link key={t.key} href={t.href as never} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t.label}
                className={`ml-2 flex-row items-center gap-2 rounded-full px-4 py-2.5 ${active ? "bg-glass-dark" : "hover:bg-white/60"}`}
              >
                <Icon name={t.icon} size={18} color={active ? "#fff" : "#6b7280"} />
                <Text className={`text-sm font-semibold ${active ? "text-white" : "text-soft"}`}>{t.label}</Text>
                {t.key === "cart" ? badge(count) : null}
              </Pressable>
            </Link>
          );
        })}
      </Glass>
    );
  }

  const translateY = hidden.interpolate({ inputRange: [0, 1], outputRange: [0, NAV_HEIGHT + 40 + insets.bottom] });
  const opacity = hidden.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, zIndex: 50, alignItems: "center", bottom: 10 + insets.bottom, transform: [{ translateY }], opacity }}
    >
      <Glass strong intensity={50} className="w-[92%] max-w-[340px] flex-row rounded-full p-1.5">
        {TABS.map((t) => {
          const active = t.key === activeKey;
          return (
            <Link key={t.key} href={t.href as never} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.label}
                className={`h-12 flex-1 items-center justify-center rounded-full ${active ? "bg-[#14141f]/90" : ""}`}
              >
                <Icon name={t.icon} size={22} color={active ? "#fff" : "#6b7280"} />
                {t.key === "cart" ? badge(count) : null}
              </Pressable>
            </Link>
          );
        })}
      </Glass>
    </Animated.View>
  );
}
