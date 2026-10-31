import { Redirect, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon, IconName } from "@/components/Icon";
import { MapPicker } from "@/components/MapPicker";
import { Media } from "@/components/ProductCard";
import { ActionBar, Screen } from "@/components/Screen";
import { PAYMENT_OPTIONS, SHIPPING_OPTIONS } from "@/data/shop";
import { useProducts } from "@/lib/products";
import { useAuth } from "@/lib/auth";
import { money, useCart } from "@/lib/cart";
import { haptic } from "@/lib/telegram";
import { CheckoutSteps } from "@/components/CheckoutSteps";
import { Row } from "@/components/Row";
import { useI18n } from "@/lib/i18n";
import { newOrderId, useOrders } from "@/lib/orders";
import { loadAddress, saveAddress } from "@/lib/address";
import type { Place } from "@/lib/geo";

type Opt = { id: string; icon: string; price?: number };

function OptionList({ options, value, onChange, prefix }: { options: readonly Opt[]; value: string; onChange: (id: string) => void; prefix: string }) {
  const { t } = useI18n();
  return (
    <View className="gap-2.5">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)}>
            <Glass strong={on} className={`flex-row items-center gap-3 rounded-2xl p-3 ${on ? "border-2 border-[#14141f]" : ""}`}>
              <View className={`h-10 w-10 items-center justify-center rounded-xl ${on ? "bg-[#14141f]" : "bg-white/70"}`}>
                <Icon name={o.icon as IconName} size={18} color={on ? "#fff" : "#111"} />
              </View>
              <View className="flex-1">
                <Text className="text-[13.5px] font-bold text-ink">{t(`${prefix}.${o.id}.title`)}</Text>
                <Text className="text-[12px] text-soft">{t(`${prefix}.${o.id}.sub`)}</Text>
              </View>
              {o.price != null ? <Text className="text-[13px] font-bold text-ink">{money(o.price)}</Text> : null}
              <View className={`h-5 w-5 items-center justify-center rounded-full ${on ? "bg-[#14141f]" : "border-2 border-gray-300"}`}>
                {on ? <Icon name="check" size={12} color="#fff" /> : null}
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
  const [placing, setPlacing] = useState(false);
  const { t } = useI18n();
  const { find: findProduct } = useProducts();
  const { session, ready } = useAuth();
  const { lines, subtotal, clear } = useCart();
  const { addOrder } = useOrders();
  const [ship, setShip] = useState<string>("standard");
  const [pay, setPay] = useState<string>("cod");
  // delivery address: typed in or picked on the map; remembered for next time
  const [address, setAddress] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => {
    loadAddress().then((s) => {
      if (s.address) setAddress((now) => now || s.address);
      if (s.place) setPlace((now) => now ?? s.place);
    });
  }, []);
  const shipping = SHIPPING_OPTIONS.find((s) => s.id === ship)?.price ?? 0;
  const total = subtotal + shipping;
  const placeOrder = () => {
    if (placing || lines.length === 0) return; // ignore double taps
    setPlacing(true);
    haptic("medium");
    setTimeout(() => {
      // keep a snapshot of the order so the invoice can be shown and downloaded later
      const id = newOrderId();
      addOrder({
        id,
        createdAt: new Date().toISOString(),
        items: lines.flatMap((l) => {
          const p = findProduct(l.productId);
          return p ? [{ productId: l.productId, name: p.name, price: p.price, qty: l.qty, variant: l.variant }] : [];
        }),
        subtotal,
        shipping,
        shippingId: ship,
        total,
        payMethod: pay,
        customer: { name: t("checkout.name"), phone: "012 345 678" },
        address: address.trim() || t("checkout.addressText"),
        ...(place ? { location: place } : {}),
      });
      saveAddress({ address: address.trim(), place });
      clear();
      router.replace({ pathname: "/success", params: { id } });
    }, 900);
  };
  if (ready && !session) return <Redirect href="/login?redirect=/checkout" />;
  
  return (
    <>
      <Screen
        title={t("checkout.title")}
        withActionBar
        contentClassName="gap-5 pt-2"
      >
        <CheckoutSteps step={2} />

        <H>{t("checkout.address")}</H>
        <Glass strong className="gap-3 rounded-2xl p-3">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#14141f]"><Icon name="pin" size={18} color="#fff" /></View>
            <View className="flex-1 gap-1">
              <Text className="text-[13.5px] font-bold text-ink">{t("checkout.name")}  <Text className="font-normal text-soft">012 345 678</Text></Text>
              <TextInput
                multiline
                value={address}
                onChangeText={setAddress}
                placeholder={t("checkout.addressText")}
                placeholderTextColor="#a9adb8"
                style={{ outlineStyle: "none", outlineWidth: 0 } as never}
                className="min-h-[40px] text-[12.5px] leading-5 text-ink"
              />
            </View>
          </View>
          {Platform.OS === "web" ? (
            <>
              <Pressable onPress={() => setMapOpen(!mapOpen)} className="flex-row items-center justify-center gap-2 rounded-xl border border-glass-line bg-white/70 py-2.5">
                <Icon name="pin" size={15} color="#14141f" />
                <Text className="text-[12.5px] font-bold text-ink">{mapOpen ? t("map.close") : place ? t("map.change") : t("map.pick")}</Text>
              </Pressable>
              {mapOpen ? (
                <MapPicker
                  value={place}
                  onChange={(p, a) => {
                    setPlace(p);
                    if (a) setAddress(a);
                  }}
                />
              ) : null}
            </>
          ) : null}
        </Glass>

        <H>{t("checkout.shipping")}</H>
        <OptionList prefix="ship" options={SHIPPING_OPTIONS} value={ship} onChange={setShip} />

        <H>{t("checkout.payment")}</H>
        <OptionList prefix="pay" options={PAYMENT_OPTIONS} value={pay} onChange={setPay} />
        <Text className="-mt-2 px-1 text-[12px] leading-5 text-soft">{t(`checkout.hint.${pay}`)}</Text>

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
        <View className="flex-row items-center justify-center gap-1.5 pb-1">
          <Icon name="check" size={13} color="#16a34a" />
          <Text className="text-[12px] text-soft">{t("checkout.secure")}</Text>
        </View>
      </Screen>

      <ActionBar>
        <View className="flex-1">
          <Text className="text-[11px] text-soft">{t("common.totalAll")}</Text>
          <Text className="text-lg font-extrabold text-ink">{money(total)}</Text>
        </View>
        <Pressable
          disabled={lines.length === 0 || placing}
          onPress={placeOrder}
          className={`min-w-[170px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#14141f] px-8 py-3.5 ${lines.length === 0 || placing ? "opacity-70" : ""}`}
        >
          {placing ? <ActivityIndicator color="#fff" size="small" /> : null}
          <Text className="text-[14px] font-bold text-white">{placing ? t("checkout.processing") : t("checkout.place")}</Text>
        </Pressable>
      </ActionBar>
    </>
  );
}
