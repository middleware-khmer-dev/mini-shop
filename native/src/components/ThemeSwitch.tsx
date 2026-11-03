import React from "react";
import { Pressable, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { ThemePref, useTheme } from "@/lib/theme";

/** Auto (follow the phone) / Light / Dark selector. */
export function ThemeSwitch() {
  const { t } = useI18n();
  const { pref, setPref } = useTheme();
  const items: { id: ThemePref; label: string }[] = [
    { id: "system", label: t("theme.auto") },
    { id: "light", label: t("theme.light") },
    { id: "dark", label: t("theme.dark") },
  ];
  return (
    <View className="flex-row rounded-full bg-surface/60 p-0.5" accessibilityRole="radiogroup">
      {items.map((i) => {
        const on = pref === i.id;
        return (
          <Pressable
            key={i.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setPref(i.id)}
            className={`min-w-[44px] items-center rounded-full px-2.5 py-1.5 ${on ? "bg-primary" : ""}`}
          >
            <Text className={`text-[12px] font-bold ${on ? "text-white" : "text-soft"}`}>{i.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
