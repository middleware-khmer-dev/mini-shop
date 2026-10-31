import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { Media } from "@/components/ProductCard";
import { ActionBar, Header, Screen } from "@/components/Screen";
import { useProducts } from "@/lib/products";
import { Row } from "@/components/Row";
import { useAuth } from "@/lib/auth";
import { SHIPPING_DEFAULT, money, useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

export default function Cart() {
  const { t } = useI18n();
  const { find: findProduct } = useProducts();
  const { session } = useAuth();
  const { lines, count, subtotal, saved, setQty, remove, clear } = useCart();
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState(false);
  const total = subtotal + SHIPPING_DEFAULT;
  const hBtn = "h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20";

  return (
    <>
      <Screen
        withActionBar={lines.length > 0}
        header={
          <Header
            title={t("cart.title", { n: count })}
            left={<Pressable onPress={() => router.back()} accessibilityLabel={t("common.back")} className={hBtn}><Icon name="back" size={18} color="#fff" /></Pressable>}
            right={<Pressable onPress={clear} accessibilityLabel={t("cart.clear")} className={hBtn}><Icon name="trash" size={18} color="#fff" /></Pressable>}
          />
        }
        contentClassName="gap-4 pt-4"
      >
        {lines.length === 0 ? (
          <View className="items-center gap-2 py-20">
            <Icon name="cart" size={44} color="#9ca3af" />
            <Text className="text-base font-bold text-ink">{t("cart.empty")}</Text>
            <Pressable onPress={() => router.push("/catalog")} className="mt-2 rounded-2xl bg-[#14141f] px-6 py-3">
              <Text className="font-bold text-white">{t("cart.shop")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {lines.map((l) => {
              const p = findProduct(l.productId);
              if (!p) return null;
              return (
                <Glass key={l.productId} className="flex-row gap-3 rounded-3xl p-3">
                  <View className="h-24 w-24 overflow-hidden rounded-2xl"><Media product={p} className="flex-1" /></View>
                  <View className="flex-1 justify-between">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text numberOfLines={2} ellipsizeMode="tail" style={{ lineHeight: 19, maxHeight: 38, overflow: "hidden" }} className="flex-1 text-[13.5px] font-semibold text-ink">{p.name}</Text>
                      <Pressable onPress={() => remove(l.productId)} accessibilityLabel={t("cart.remove")}><Icon name="close" size={16} color="#6b7280" /></Pressable>
                    </View>
                    <Text className="text-[12px] text-soft">{l.variant}</Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-extrabold text-ink">{money(p.price * l.qty)}</Text>
                      <View className="flex-row items-center rounded-xl bg-white/80">
                        <Pressable onPress={() => setQty(l.productId, l.qty - 1)} accessibilityLabel={t("cart.dec")} className="h-8 w-8 items-center justify-center"><Icon name="minus" size={14} /></Pressable>
                        <Text className="w-6 text-center text-[13px] font-bold text-ink">{l.qty}</Text>
                        <Pressable onPress={() => setQty(l.productId, l.qty + 1)} accessibilityLabel={t("cart.inc")} className="h-8 w-8 items-center justify-center"><Icon name="plus" size={14} /></Pressable>
                      </View>
                    </View>
                  </View>
                </Glass>
              );
            })}

            <Glass strong className="flex-row items-center gap-2 rounded-2xl p-2 pl-4">
              <Icon name="gift" size={18} color="#6b7280" />
              <TextInput value={promo} onChangeText={setPromo} editable={!applied} placeholder={applied ? t("cart.promoApplied") : t("cart.promoPh")} placeholderTextColor="#a9adb8" className="flex-1 py-2 text-[13px] text-ink" />
              <Pressable onPress={() => promo.trim() && (setApplied(true), setPromo(""))} className="rounded-xl bg-black px-4 py-2.5"><Text className="text-[12.5px] font-bold text-white">{t("cart.apply")}</Text></Pressable>
            </Glass>

            <Text className="text-base font-bold text-ink">{t("cart.summary")}</Text>
            <Glass strong className="gap-2.5 rounded-3xl p-4">
              <Row label={t("cart.subtotal")} value={money(subtotal)} />
              <Row label={t("cart.saved")} value={`-${money(saved)}`} green />
              <Row label={t("cart.shipping")} value={money(SHIPPING_DEFAULT)} />
              <View className="my-1 h-px bg-white/70" />
              <Row label={t("common.total")} value={money(total)} big />
            </Glass>
          </>
        )}
      </Screen>

      {lines.length > 0 ? (
        <ActionBar>
          <View className="flex-1">
            <Text className="text-[11px] text-soft">{t("common.totalAll")}</Text>
            <Text className="text-lg font-extrabold text-ink">{money(total)}</Text>
          </View>
          <Pressable onPress={() => (session ? router.push("/checkout") : router.push({ pathname: "/login", params: { redirect: "/checkout" } }))} className="rounded-2xl bg-[#14141f] px-8 py-3.5"><Text className="text-[14px] font-bold text-white">{t("cart.pay")}</Text></Pressable>
        </ActionBar>
      ) : null}
    </>
  );
}
