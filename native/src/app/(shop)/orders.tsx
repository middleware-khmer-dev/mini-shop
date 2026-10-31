import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { isFinal } from "@/components/OrderTracker";
import { Screen } from "@/components/Screen";
import { ORDERS_API, fetchOrderStatus } from "@/lib/api";
import { money } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { useOrders } from "@/lib/orders";

const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const chip: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

/** Account → My orders: every order placed on this device, with its latest status from the server. */
export default function MyOrders() {
  const { t } = useI18n();
  const { orders, setStatus } = useOrders();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!ORDERS_API) return;
    const open = orders.filter((o) => o.token && !isFinal(o.status));
    if (open.length === 0) return;
    setRefreshing(true);
    await Promise.all(open.map((o) => fetchOrderStatus(o.id, o.token!).then((s) => setStatus(o.id, s.status, s.paid)).catch(() => {})));
    setRefreshing(false);
  }, [orders, setStatus]);

  // look up the open orders when the page opens
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  return (
    <Screen title={t("orders.title")} contentClassName="gap-3 pt-2">
      {orders.length > 0 && ORDERS_API ? (
        <Pressable onPress={refresh} className="self-end rounded-full border border-glass-line bg-white/60 px-3 py-1.5">
          <Text className="text-[12px] font-semibold text-ink">{refreshing ? t("orders.refreshing") : t("orders.refresh")}</Text>
        </Pressable>
      ) : null}

      {orders.length === 0 ? (
        <View className="items-center gap-2 py-16">
          <Icon name="cart" size={40} color="#9ca3af" />
          <Text className="font-bold text-ink">{t("orders.empty")}</Text>
          <Text className="text-center text-[12.5px] text-soft">{t("orders.emptySub")}</Text>
          <Pressable onPress={() => router.replace("/catalog")} className="mt-3 rounded-2xl bg-[#14141f] px-5 py-3">
            <Text className="font-bold text-white">{t("fav.browse")}</Text>
          </Pressable>
        </View>
      ) : (
        orders.map((o) => {
          const status = o.status ?? "";
          const count = o.items.reduce((n, i) => n + i.qty, 0);
          return (
            <Pressable key={o.id} onPress={() => router.push({ pathname: "/success", params: { id: o.id } })}>
              <Glass strong className="gap-2 rounded-2xl p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] font-extrabold text-ink">#{o.id}</Text>
                  {status ? (
                    <View className={`rounded-full px-2.5 py-0.5 ${chip[status]?.split(" ")[0] ?? "bg-gray-100"}`}>
                      <Text className={`text-[11.5px] font-bold ${chip[status]?.split(" ")[1] ?? "text-ink"}`}>{t(`order.s.${status}`, { fallback: status })}</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-[12px] text-soft">{formatDate(o.createdAt)}</Text>
                <View className="flex-row items-center justify-between">
                  <Text numberOfLines={1} className="flex-1 pr-3 text-[13px] text-ink">{o.items.map((i) => i.name).join(", ")}</Text>
                  <Text className="text-[14px] font-extrabold text-ink">{money(o.total)}</Text>
                </View>
                <Text className="text-[12px] text-soft">{t("orders.items", { n: count })}</Text>
              </Glass>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
