import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { PAYMENT_OPTIONS } from "@/data/shop";

export default function Success() {
  const { total, pay } = useLocalSearchParams<{ total?: string; pay?: string }>();
  const orderNo = useMemo(() => `#MS${Math.floor(100000 + Math.random() * 900000)}`, []);
  const payLabel = PAYMENT_OPTIONS.find((p) => p.id === pay)?.title ?? "";
  return (
    <Screen contentClassName="items-center gap-4 pt-20">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-green-500"><Icon name="check" size={40} color="#fff" /></View>
      <Text className="text-2xl font-extrabold text-ink">ការបញ្ជាទិញជោគជ័យ!</Text>
      <Text className="text-center text-[13px] text-soft">អរគុណសម្រាប់ការទិញទំនិញ។ យើងនឹងដឹកជញ្ជូនជូនអ្នកឆាប់ៗនេះ។</Text>
      <Glass strong className="w-full max-w-[420px] gap-3 rounded-3xl p-5">
        <Line k="លេខបញ្ជាទិញ" v={orderNo} />
        <Line k="វិធីទូទាត់" v={payLabel} />
        <Line k="សរុប" v={`$${total ?? "0.00"}`} />
      </Glass>
      <View className="w-full max-w-[420px] gap-2.5">
        <Pressable onPress={() => router.replace("/home")} className="items-center rounded-2xl bg-[#14141f] py-3.5"><Text className="font-bold text-white">ត្រឡប់ទៅទំព័រដើម</Text></Pressable>
        <Pressable onPress={() => router.replace("/catalog")} className="items-center rounded-2xl border border-glass-line bg-white/70 py-3.5"><Text className="font-bold text-ink">បន្តទិញទំនិញ</Text></Pressable>
      </View>
    </Screen>
  );
}

const Line = ({ k, v }: { k: string; v: string }) => (
  <View className="flex-row items-center justify-between">
    <Text className="text-[12.5px] text-soft">{k}</Text>
    <Text className="text-[13px] font-bold text-ink">{v}</Text>
  </View>
);
