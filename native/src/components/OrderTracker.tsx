import React from "react";
import { Text, View } from "react-native";
import { Icon } from "./Icon";
import { useI18n } from "@/lib/i18n";

export const STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;
export const isFinal = (status?: string) => status === "delivered" || status === "cancelled";

/** Where an order is: placed, confirmed, on the way, delivered (or cancelled). */
export function OrderTracker({ status }: { status: string }) {
  const { t } = useI18n();
  if (status === "cancelled") {
    return (
      <View className="flex-row items-center gap-2 self-center rounded-full bg-red-50 px-4 py-2">
        <Icon name="close" size={14} color="#b91c1c" />
        <Text className="text-[13px] font-bold text-red-700">{t("order.s.cancelled")}</Text>
      </View>
    );
  }
  const at = Math.max(0, STEPS.indexOf(status as (typeof STEPS)[number]));
  return (
    <View className="w-full max-w-[440px] flex-row">
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <View key={s} className="flex-1 items-center">
            <View className="w-full flex-row items-center">
              <View className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : i <= at ? "bg-[#14141f]" : "bg-gray-300"}`} />
              <View className={`h-6 w-6 items-center justify-center rounded-full ${done ? "bg-[#14141f]" : "border-2 border-gray-300 bg-white"}`}>
                {done ? <Icon name="check" size={13} color="#fff" /> : null}
              </View>
              <View className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "bg-transparent" : i < at ? "bg-[#14141f]" : "bg-gray-300"}`} />
            </View>
            <Text className={`mt-1.5 px-0.5 text-center text-[11px] leading-4 ${i === at ? "font-bold text-ink" : "text-soft"}`}>{t(`order.s.${s}`)}</Text>
          </View>
        );
      })}
    </View>
  );
}
