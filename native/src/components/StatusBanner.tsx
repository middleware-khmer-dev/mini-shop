import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useProducts } from "@/lib/products";
import { useI18n } from "@/lib/i18n";

export function StatusBanner() {
  const { t } = useI18n();
  const { loading, error, offline, reload } = useProducts();
  if (loading) return <ActivityIndicator className="my-2" />;
  if (error && offline)
    return (
      <Pressable onPress={reload} className="flex-row items-center justify-between rounded-2xl bg-amber-100/80 px-4 py-3">
        <Text className="flex-1 text-[12.5px] text-amber-900">{t("banner.offline")}</Text>
        <Text className="text-[12.5px] font-bold text-amber-900">{t("banner.retry")}</Text>
      </Pressable>
    );
  return null;
}
