import React from "react";
import { Text, View } from "react-native";

export function Row({ label, value, green, big }: { label: string; value: string; green?: boolean; big?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={big ? "text-base font-extrabold text-ink" : "text-[13px] text-soft"}>{label}</Text>
      <Text className={`${big ? "text-xl font-extrabold text-ink" : "text-[13px] font-bold"} ${green ? "text-green-500" : "text-ink"}`}>{value}</Text>
    </View>
  );
}
