import React from "react";
import { Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { Icon } from "./Icon";

/** 1 cart - 2 pay - 3 done. `step` is the current one (1-3). */
export function CheckoutSteps({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useI18n();
  const items = [t("steps.cart"), t("steps.pay"), t("steps.done")];
  return (
    <View className="flex-row items-center px-1" accessibilityLabel={`${step}/3`}>
      {items.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <React.Fragment key={label}>
            <View className="items-center gap-1">
              <View className={`h-7 w-7 items-center justify-center rounded-full ${done || active ? "bg-[#14141f]" : "bg-white/70"}`}>
                {done ? <Icon name="check" size={14} color="#fff" /> : <Text className={`text-[12px] font-bold ${active ? "text-white" : "text-soft"}`}>{n}</Text>}
              </View>
              <Text className={`text-[11px] ${active ? "font-bold text-ink" : "text-soft"}`}>{label}</Text>
            </View>
            {n < 3 ? <View className={`mx-2 mb-4 h-0.5 flex-1 rounded-full ${done ? "bg-[#14141f]" : "bg-white/70"}`} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}
