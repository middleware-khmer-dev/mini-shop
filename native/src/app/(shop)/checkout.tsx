import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon, IconName } from "@/components/Icon";
import { Media } from "@/components/ProductCard";
import { ActionBar, Header, Screen } from "@/components/Screen";
import { PAYMENT_OPTIONS, SHIPPING_OPTIONS } from "@/data/shop";
import { useProducts } from "@/lib/products";
import { useAuth } from "@/lib/auth";
import { money, useCart } from "@/lib/cart";
import { useMainButton } from "@/lib/telegram";
import { Row } from "@/components/Row";
import { useI18n } from "@/lib/i18n";

type Opt = { id: string; icon: string; price?: number };

function OptionList({ options, value, onChange, prefix }: { options: readonly Opt[]; value: string; onChange: (id: string) => void; prefix: string }) {
  const { t } = useI18n();
  return (
    <View className="gap-2.5">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)}>
            <Glass strong={on} className={`flex-row items-center gap-3 rounded-2xl p-3 ${on ? "border-violet-500" : ""}`}>
              <View className={`h-10 w-10 items-center justify-center rounded-xl ${on ? "bg-[#14141f]" : "bg-white/70"}`}>
                <Icon name={o.icon as IconName} size={18} color={on ? "#fff" : "#111"} />
              </View>
              <View className="flex-1">
                <Text className="text-[13.5px] font-bold text-ink">{t(`${prefix}.${o.id}.title`)}</Text>
                <Text className="text-[12px] text-soft">{t(`${prefix}.${o.id}.sub`)}</Text>
              </View>
              {o.price != null ? <Text className="text-[13px] font-bold text-ink">{money(o.price)}</Text> : null}
              <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-ink" : "border-gray-300"}`}>
                {on ? <View className="h-2.5 w-2.5 rounded-full bg-ink" /> : null}
              </View>
            </Glass>
          </Pressable>
        );
      })}
    </View>
  );
}

const H = ({ children }: { children: string }) => <Text className="text-base font-bold text-ink">{children}</Text>;

export default function Checkout() {
  const { t } = useI18n();
  const { find: findProduct } = useProducts();
  const { session, ready } = useAuth();
  const { lines, subtotal, clear } = useCart();
  const [ship, setShip] = useState<string>("standard");
  const [pay, setPay] = useState<string>("cod");
  const shipping = SHIPPING_OPTIONS.find((s) => s.id === ship)?.price ?? 0;
  const total = subtotal + shipping;
  const placeOrder = () => {
    clear();
    router.replace({ pathname: "/success", params: { total: total.toFixed(2), pay } });
  };
  const native = useMainButton({ text: `${t("checkout.place")} · ${money(total)}`, onPress: placeOrder, visible: lines.length > 0 });
  if (ready && !session) return <Redirect href="/login?redirect=/checkout" />;
  const hBtn = "h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20";

  return (
    <>
      <Screen
        withActionBar={!native}
        header={<Header title={t("checkout.title")} left={native ? <View className="h-10 w-10" /> : <Pressable onPress={() => router.back()} accessibilityLabel={t("common.back")} className={hBtn}><Icon name="back" size={18} color="#fff" /></Pressable>} right={<View className="h-10 w-10" />} />}
        contentClassName="gap-5 pt-4"
      >
        <H>{t("checkout.address")}</H>
        <Glass strong className="flex-row items-start gap-3 rounded-2xl p-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#14141f]"><Icon name="pin" size={18} color="#fff" /></View>
          <View className="flex-1 gap-1">
            <Text className="text-[13.5px] font-bold text-ink">{t("checkout.name")}  <Text className="font-normal text-soft">012 345 678</Text></Text>
            <Text className="text-[12.5px] text-soft">{t("checkout.addressText")}</Text>
          </View>
          <Text className="text-[12px] font-bold text-ink">{t("checkout.change")}</Text>
        </Glass>

        <H>{t("checkout.shipping")}</H>
        <OptionList prefix="ship" options={SHIPPING_OPTIONS} value={ship} onChange={setShip} />

        <H>{t("checkout.payment")}</H>
        <OptionList prefix="pay" options={PAYMENT_OPTIONS} value={pay} onChange={setPay} />

        <H>{t("checkout.items")}</H>
        <Glass className="gap-3 rounded-2xl p-3">
          {lines.map((l) => {
            const p = findProduct(l.productId);
            if (!p) return null;
            return (
              <View key={l.productId} className="flex-row items-center gap-3">
                <View className="h-12 w-12 overflow-hidden rounded-xl"><Media product={p} className="flex-1" /></View>
                <Text numberOfLines={1} className="flex-1 text-[13px] text-ink">{p.name}</Text>
                <Text className="text-[12px] text-soft">×{l.qty}</Text>
                <Text className="text-[13px] font-bold text-ink">{money(p.price * l.qty)}</Text>
              </View>
            );
          })}
        </Glass>

        <H>{t("checkout.note")}</H>
        <TextInput multiline numberOfLines={2} placeholder={t("checkout.notePh")} placeholderTextColor="#a9adb8" className="min-h-[64px] rounded-2xl border border-glass-line bg-white/60 p-3 text-[13px] text-ink" />

        <Glass strong className="gap-2.5 rounded-3xl p-4">
          <Row label={t("cart.subtotal")} value={money(subtotal)} />
          <Row label={t("cart.shipping")} value={money(shipping)} />
          <View className="my-1 h-px bg-white/70" />
          <Row label={t("common.total")} value={money(total)} big />
        </Glass>
      </Screen>

      {!native ? (
      <ActionBar>
        <View className="flex-1">
          <Text className="text-[11px] text-soft">{t("common.totalAll")}</Text>
          <Text className="text-lg font-extrabold text-ink">{money(total)}</Text>
        </View>
        <Pressable
          disabled={lines.length === 0}
          onPress={placeOrder}
          className={`rounded-2xl bg-[#14141f] px-8 py-3.5 ${lines.length === 0 ? "opacity-50" : ""}`}
        >
          <Text className="text-[14px] font-bold text-white">{t("checkout.place")}</Text>
        </Pressable>
      </ActionBar>
      ) : null}
    </>
  );
}
