import { Link, usePathname } from "expo-router";
import React from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useCart } from "@/lib/cart";
import { Glass } from "./Glass";
import { Icon, IconName } from "./Icon";
import { NAV_FREE_ROUTES, NAV_HEIGHT, PILL_BOTTOM_SPACE, useBottomInset, useNav } from "./nav-context";
import { useI18n } from "@/lib/i18n";

const TABS: { key: string; label: string; href: string; icon: IconName; match: string[] }[] = [
  { key: "home", label: "nav.home", href: "/home", icon: "home", match: ["/home"] },
  { key: "catalog", label: "nav.catalog", href: "/catalog", icon: "grid", match: ["/catalog", "/product"] },
  { key: "cart", label: "nav.cart", href: "/cart", icon: "cart", match: ["/cart", "/checkout", "/success"] },
  { key: "profile", label: "nav.profile", href: "/profile", icon: "user", match: ["/profile", "/favorites", "/address", "/orders"] },
];

/**
 * Phone: round (50px) icon-only pill floating at the bottom; slides away on scroll down.
 * Wide web (desktop): navigation bar pinned to the top, with labels.
 */
export function PillNav() {
  const { t: tr } = useI18n();
  const path = usePathname();
  const { hidden, wide } = useNav();
  const { count } = useCart();
  const bottomInset = useBottomInset();
  const activeKey = TABS.find((t) => t.match.some((m) => path.startsWith(m)))?.key;

  const badge = (n: number) =>
    n > 0 ? (
      <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1">
        <Text className="text-[9px] font-extrabold text-white">{n}</Text>
      </View>
    ) : null;

  if (wide) {
    return (
      <Glass solid className="absolute inset-x-0 top-0 z-50 flex-row items-center border-x-0 border-t-0 px-10" style={{ height: NAV_HEIGHT }}>
        <Link href="/home" className="mr-auto text-lg font-extrabold text-ink">
          🛍️ Mini Shop
        </Link>
        {TABS.map((t) => {
          const active = t.key === activeKey;
          return (
            <Link key={t.key} href={t.href as never} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={tr(t.label)}
                className={`ml-2 flex-row items-center gap-2 rounded-full px-4 py-2.5 ${active ? "bg-glass-dark" : "hover:bg-white/60"}`}
              >
                <Icon name={t.icon} size={18} color={active ? "#fff" : "#6b7280"} />
                <Text className={`text-sm font-semibold ${active ? "text-white" : "text-soft"}`}>{tr(t.label)}</Text>
                {t.key === "cart" ? badge(count) : null}
              </Pressable>
            </Link>
          );
        })}
      </Glass>
    );
  }

  if (NAV_FREE_ROUTES.test(path)) return null;

  const translateY = hidden.interpolate({ inputRange: [0, 1], outputRange: [0, PILL_BOTTOM_SPACE + bottomInset + 30] });
  const opacity = hidden.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // Phone / Telegram: compact bar stretched edge to edge along the bottom, icons only
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 50, transform: [{ translateY }], opacity }}
    >
      <Glass
        solid
        className="w-full flex-row rounded-t-[26px] border-x-0 border-b-0 px-3 pt-1.5 shadow-2xl shadow-black/30"
        style={{ paddingBottom: 10 + bottomInset }}
      >
        {TABS.map((t) => {
          const active = t.key === activeKey;
          return (
            <Link key={t.key} href={t.href as never} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={tr(t.label)} className="h-11 flex-1 items-center justify-center">
                <View className={`h-10 w-16 items-center justify-center rounded-full ${active ? "bg-[#14141f]/90" : ""}`}>
                  <Icon name={t.icon} size={22} color={active ? "#fff" : "#6b7280"} />
                  {t.key === "cart" ? badge(count) : null}
                </View>
              </Pressable>
            </Link>
          );
        })}
      </Glass>
    </Animated.View>
  );
}
