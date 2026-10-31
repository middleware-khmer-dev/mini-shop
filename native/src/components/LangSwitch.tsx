import React from "react";
import { Pressable, Text, View } from "react-native";
import { Lang, useI18n } from "@/lib/i18n";

/** Khmer / English toggle. `dark` is for use on the dark glass header. */
export function LangSwitch({ dark }: { dark?: boolean }) {
  const { lang, setLang } = useI18n();
  const items: { id: Lang; label: string }[] = [
    { id: "km", label: "ខ្មែរ" },
    { id: "en", label: "EN" },
  ];
  return (
    <View className={`flex-row rounded-full p-0.5 ${dark ? "bg-white/20" : "bg-white/60"}`} accessibilityRole="radiogroup">
      {items.map((i) => {
        const on = lang === i.id;
        return (
          <Pressable
            key={i.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setLang(i.id)}
            className={`min-w-[40px] items-center rounded-full px-2.5 py-1.5 ${on ? (dark ? "bg-white" : "bg-[#14141f]") : ""}`}
          >
            <Text className={`text-[12px] font-bold ${on ? (dark ? "text-ink" : "text-white") : dark ? "text-white" : "text-soft"}`}>{i.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
