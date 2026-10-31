import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { Lang, useI18n } from "@/lib/i18n";
import { DownloadKind, InvoiceLabels, downloadInvoice } from "@/lib/invoice";
import { useTelegram } from "@/lib/telegram";
import { Order, OrderItem, useOrders } from "@/lib/orders";
import { money } from "@/lib/cart";

const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const itemLine = (i: OrderItem) => (i.variant ? `${i.name} (${i.variant})` : i.name);

function labelsFor(order: Order, t: (k: string) => string, _lang: Lang): InvoiceLabels {
  return {
    brand: t("invoice.brand"),
    title: t("invoice.title"),
    number: t("invoice.number"),
    date: t("invoice.date"),
    billTo: t("invoice.billTo"),
    deliverTo: t("invoice.deliverTo"),
    item: t("invoice.item"),
    qty: t("invoice.qty"),
    amount: t("invoice.amount"),
    subtotal: t("cart.subtotal"),
    shipping: t("cart.shipping"),
    total: t("common.total"),
    payment: t("invoice.payment"),
    status: t(`invoice.status.${order.payMethod}`),
    thanks: t("invoice.thanks"),
    dateText: formatDate(order.createdAt),
    paymentText: t(`pay.${order.payMethod}.title`),
  };
}

export default function Invoice() {
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { find } = useOrders();
  const { inTelegram } = useTelegram();
  const [viewer, setViewer] = useState<{ imageUrl: string; width: number; height: number } | null>(null);
  const order = find(id);
  const [busy, setBusy] = useState<DownloadKind | null>(null);
  const [failed, setFailed] = useState(false);

  if (!order) {
    return (
      <Screen contentClassName="items-center gap-4 pt-24">
        <Icon name="close" size={36} color="#9ca3af" />
        <Text className="text-base font-bold text-ink">{t("invoice.notFound")}</Text>
        <Pressable onPress={() => router.replace("/home")} className="rounded-2xl bg-[#14141f] px-6 py-3">
          <Text className="font-bold text-white">{t("success.home")}</Text>
        </Pressable>
      </Screen>
    );
  }

  const L = labelsFor(order, t, lang);
  const download = async (kind: DownloadKind) => {
    setFailed(false);
    setBusy(kind);
    try {
      const res = await downloadInvoice(order, L, itemLine, kind, { inTelegram });
      if (res.via === "viewer") setViewer({ imageUrl: res.imageUrl, width: res.width, height: res.height });
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen contentClassName="items-center gap-4 pt-2">
      <View className="items-center gap-2">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-green-500"><Icon name="check" size={28} color="#fff" /></View>
        <Text className="text-xl font-extrabold text-ink">{t("success.title")}</Text>
      </View>

      {/* the invoice, laid out like a paper receipt */}
      <View className="w-full max-w-[440px] overflow-hidden rounded-3xl bg-white shadow-lg shadow-black/10">
        <View className="h-2 bg-[#14141f]" />
        <View className="gap-4 p-5">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-[17px] font-extrabold text-ink">{L.brand}</Text>
              <Text className="mt-1 text-[12px] text-soft">{L.number}</Text>
              <Text className="text-[14px] font-bold text-ink">#{order.id}</Text>
            </View>
            <View className="items-end gap-1">
              <Text className="text-[20px] font-extrabold text-ink">{L.title}</Text>
              <View className="rounded-full bg-amber-100 px-3 py-1"><Text className="text-[11.5px] font-bold text-amber-800">{L.status}</Text></View>
              <Text className="text-[12px] text-soft">{L.dateText}</Text>
            </View>
          </View>

          <View className="rounded-2xl bg-gray-50 p-3">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-soft">{L.deliverTo}</Text>
            <Text className="mt-1 text-[14px] font-bold text-ink">{order.customer.name}  <Text className="font-normal text-soft">{order.customer.phone}</Text></Text>
            <Text className="mt-0.5 text-[12.5px] leading-5 text-soft">{order.address}</Text>
          </View>

          <View>
            <View className="flex-row border-b border-gray-200 pb-2">
              <Text className="flex-1 text-[11px] font-bold uppercase text-soft">{L.item}</Text>
              <Text className="w-10 text-right text-[11px] font-bold uppercase text-soft">{L.qty}</Text>
              <Text className="w-20 text-right text-[11px] font-bold uppercase text-soft">{L.amount}</Text>
            </View>
            {order.items.map((i) => (
              <View key={`${i.productId}-${i.variant}`} className="flex-row items-start border-b border-gray-100 py-2.5">
                <Text className="flex-1 pr-2 text-[13px] font-semibold leading-5 text-ink">{itemLine(i)}</Text>
                <Text className="w-10 text-right text-[13px] text-ink">{i.qty}</Text>
                <Text className="w-20 text-right text-[13px] font-bold text-ink">{money(i.price * i.qty)}</Text>
              </View>
            ))}
          </View>

          <View className="gap-1.5 self-end" style={{ width: "62%" }}>
            <View className="flex-row justify-between"><Text className="text-[13px] text-soft">{L.subtotal}</Text><Text className="text-[13px] font-bold text-ink">{money(order.subtotal)}</Text></View>
            <View className="flex-row justify-between"><Text className="text-[13px] text-soft">{L.shipping}</Text><Text className="text-[13px] font-bold text-ink">{money(order.shipping)}</Text></View>
            <View className="mt-1 flex-row items-center justify-between border-t-2 border-ink pt-2">
              <Text className="text-[15px] font-extrabold text-ink">{L.total}</Text>
              <Text className="text-[20px] font-extrabold text-ink">{money(order.total)}</Text>
            </View>
          </View>

          <Text className="text-[12.5px] text-soft">{L.payment}: <Text className="font-bold text-ink">{L.paymentText}</Text></Text>
        </View>
      </View>

      <View className="w-full max-w-[440px] gap-2.5">
        <Pressable
          disabled={busy !== null}
          onPress={() => download("pdf")}
          className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-[#14141f] ${busy ? "opacity-70" : ""}`}
        >
          {busy === "pdf" ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="download" size={18} color="#fff" />}
          <Text className="text-[14px] font-bold text-white">{busy === "pdf" ? t("invoice.preparing") : t("invoice.download")}</Text>
        </Pressable>
        {Platform.OS === "web" ? (
          <Pressable
            disabled={busy !== null}
            onPress={() => download("png")}
            className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-black/15 bg-white ${busy ? "opacity-70" : ""}`}
          >
            {busy === "png" ? <ActivityIndicator color="#111" size="small" /> : <Icon name="image" size={18} color="#111" />}
            <Text className="text-[14px] font-bold text-ink">{busy === "png" ? t("invoice.preparing") : t("invoice.saveImage")}</Text>
          </Pressable>
        ) : null}
        {failed ? <Text className="text-center text-[12.5px] text-red-600">{t("invoice.failed")}</Text> : null}
        {inTelegram ? <Text className="px-2 text-center text-[11.5px] leading-4 text-soft">{t("invoice.hint")}</Text> : null}
        <View className="flex-row gap-2.5">
          <Pressable onPress={() => router.replace("/home")} className="h-12 flex-1 items-center justify-center rounded-2xl border border-glass-line bg-white/70">
            <Text className="text-[13px] font-bold text-ink">{t("success.home")}</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/catalog")} className="h-12 flex-1 items-center justify-center rounded-2xl border border-glass-line bg-white/70">
            <Text className="text-[13px] font-bold text-ink">{t("success.more")}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View className="flex-1 bg-black/70 px-3 py-10">
          <View className="flex-1 overflow-hidden rounded-3xl bg-white">
            <ScrollView contentContainerClassName="p-3">
              {viewer ? (
                <Image source={{ uri: viewer.imageUrl }} resizeMode="contain" accessibilityLabel={`${L.title} #${order.id}`} style={{ width: "100%", aspectRatio: viewer.width / viewer.height }} />
              ) : null}
            </ScrollView>
            <View className="gap-2 border-t border-gray-100 p-3">
              <Text className="text-center text-[12.5px] leading-5 text-soft">{t("invoice.holdToSave")}</Text>
              <Pressable onPress={() => setViewer(null)} className="h-11 items-center justify-center rounded-2xl bg-[#14141f]">
                <Text className="text-[14px] font-bold text-white">{t("invoice.close")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
