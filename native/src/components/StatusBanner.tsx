import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useProducts } from "@/lib/products";

export function StatusBanner() {
  const { loading, error, offline, reload } = useProducts();
  if (loading) return <ActivityIndicator className="my-2" />;
  if (error && offline)
    return (
      <Pressable onPress={reload} className="flex-row items-center justify-between rounded-2xl bg-amber-100/80 px-4 py-3">
        <Text className="flex-1 text-[12.5px] text-amber-900">មិនអាចទាញយកទំនិញបានទេ — បង្ហាញទិន្នន័យគំរូ</Text>
        <Text className="text-[12.5px] font-bold text-amber-900">ព្យាយាមម្តងទៀត</Text>
      </Pressable>
    );
  return null;
}
