import { Redirect, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon, IconName } from "@/components/Icon";
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
import { Order, newOrderId, useOrders } from "@/lib/orders";
import { CashQuote, ORDERS_API, OrderError, placeOrder as placeRemote, quoteCash } from "@/lib/api";
import { useAddresses } from "@/lib/address";

type Opt = { id: string; icon: string; price?: number };

function OptionList({ options, value, onChange, prefix, disabled = [] }: { options: readonly Opt[]; value: string; onChange: (id: string) => void; prefix: string; disabled?: string[] }) {
  const { t } = useI18n();
  return (
    <View className="gap-2.5">
      {options.map((o) => {
        const on = o.id === value;
        const off = disabled.includes(o.id);
        return (
          <Pressable key={o.id} disabled={off} onPress={() => onChange(o.id)} accessibilityState={{ disabled: off }}>
            <Glass strong={on} className={`flex-row items-center gap-3 rounded-2xl p-3 ${on ? "border-2 border-[#14141f]" : ""} ${off ? "opacity-45" : ""}`}>
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
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const { addresses, selected, select } = useAddresses();
  // cash is only for addresses within the shop's radius; the server tells us, and checks again when the order is placed
  const [cash, setCash] = useState<{ state: "checking" | "ok" | "error"; quote?: CashQuote }>({ state: ORDERS_API ? "checking" : "ok" });
  const pinKey = selected?.place ? `${selected.place.lat},${selected.place.lng}` : "";
  useEffect(() => {
    if (!ORDERS_API) return;
    let alive = true;
    setCash({ state: "checking" });
    quoteCash(selected?.place ?? null)
      .then((quote) => alive && setCash({ state: "ok", quote }))
      .catch(() => alive && setCash({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [pinKey, selected?.id]);
  const checking = !!ORDERS_API && cash.state === "checking";
  // while the distance is being checked cash stays selectable (the Pay button waits); once known it is on or off
  const cashOk = !ORDERS_API || checking || (cash.state === "ok" && cash.quote?.cashAllowed === true);
  useEffect(() => {
    if (!cashOk && pay === "cod") setPay("khqr"); // cash no longer possible: switch to QR
  }, [cashOk, pay]);
  const cashNote =
    !ORDERS_API ? ""
    : cash.state === "checking" ? t("pay.cash.checking")
    : cash.state === "error" ? t("pay.cash.error")
    : cash.quote?.distanceKm == null ? t("pay.cash.nopin", { r: cash.quote?.radiusKm ?? 10 })
    : cash.quote.cashAllowed ? t("pay.cash.ok", { r: cash.quote.radiusKm, km: cash.quote.distanceKm })
    : t("pay.cash.far", { r: cash.quote.radiusKm, km: cash.quote.distanceKm });
  // delivery fee by distance from the shop (the server works it out; the shop sets the steps in its admin page)
  const fees = cash.state === "ok" ? cash.quote?.fees : undefined;
  const shipOptions = SHIPPING_OPTIONS.map((o) => ({ ...o, price: fees?.[o.id as "standard" | "express"] ?? o.price }));
  const shipping = shipOptions.find((s) => s.id === ship)?.price ?? 0;
  const shipNote =
    !ORDERS_API || cash.state !== "ok" || !fees ? ""
    : cash.quote?.distanceKm == null ? t("ship.nopin")
    : t("ship.byDistance", { km: cash.quote.distanceKm });
  const total = subtotal + shipping;
  const customer = { name: session?.user.name ?? "", phone: session?.user.phone ?? "" };

  const placeOrder = async () => {
    if (placing || lines.length === 0 || !selected || (pay === "cod" && (!cashOk || checking))) return; // ignore double taps
    setPlacing(true);
    setError("");
    haptic("medium");
    const base = {
      shippingId: ship,
      payMethod: pay,
      customer,
      address: selected.address,
      note: note.trim(),
      ...(selected.place ? { location: selected.place } : {}),
    };
    try {
      let order: Order;
      if (ORDERS_API) {
        // the server works out the prices itself and gives the order its number
        const placed = await placeRemote({ ...base, items: lines.map((l) => ({ productId: l.productId, qty: l.qty, variant: l.variant })) });
        order = { ...base, ...(placed.qrImage ? { qrImage: placed.qrImage } : {}), id: placed.id, createdAt: placed.createdAt, items: placed.items, subtotal: placed.subtotal, shipping: placed.shipping, total: placed.total, token: placed.token, status: placed.status };
      } else {
        // no server configured (local development): keep the order on this device only
        order = {
          ...base,
          id: newOrderId(),
          createdAt: new Date().toISOString(),
          items: lines.flatMap((l) => {
            const p = findProduct(l.productId);
            return p ? [{ productId: l.productId, name: p.name, price: p.price, qty: l.qty, variant: l.variant }] : [];
          }),
          subtotal,
          shipping,
          total,
        };
      }
      addOrder(order); // keep a copy so the invoice can be shown and downloaded later
      clear();
      router.replace({ pathname: "/success", params: { id: order.id } });
    } catch (e) {
      const code = e instanceof OrderError ? e.code : "network";
      setError(t(["unknown_product", "bad_phone", "name_required", "network", "cash_not_allowed"].includes(code) ? `checkout.err.${code}` : "checkout.err.other"));
      setPlacing(false);
    }
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
        {addresses.map((a) => {
          const on = a.id === selected?.id;
          return (
            <Pressable key={a.id} onPress={() => select(a.id)}>
              <Glass strong={on} className={`flex-row items-start gap-3 rounded-2xl p-3 ${on ? "border-2 border-[#14141f]" : ""}`}>
                <View className={`h-10 w-10 items-center justify-center rounded-xl ${on ? "bg-[#14141f]" : "bg-white/70"}`}>
                  <Icon name="pin" size={18} color={on ? "#fff" : "#111"} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[13.5px] font-bold text-ink">{t(`address.label.${a.label}`)}  <Text className="font-normal text-soft">{customer.name} · {customer.phone}</Text></Text>
                  <Text className="text-[12.5px] leading-5 text-soft">{a.address}</Text>
                </View>
                <View className={`h-5 w-5 items-center justify-center rounded-full ${on ? "bg-[#14141f]" : "border-2 border-gray-300"}`}>
                  {on ? <Icon name="check" size={12} color="#fff" /> : null}
                </View>
              </Glass>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push("/address")} className="flex-row items-center justify-center gap-2 rounded-2xl border border-glass-line bg-white/70 py-3">
          <Icon name={addresses.length === 0 ? "plus" : "pin"} size={15} color="#14141f" />
          <Text className="text-[12.5px] font-bold text-ink">{addresses.length === 0 ? t("checkout.addAddress") : t("checkout.manageAddress")}</Text>
        </Pressable>

        <H>{t("checkout.shipping")}</H>
        <OptionList prefix="ship" options={shipOptions} value={ship} onChange={setShip} />
        {shipNote ? <Text className="-mt-2 px-1 text-[12px] leading-5 text-soft">{shipNote}</Text> : null}

        <H>{t("checkout.payment")}</H>
        <OptionList prefix="pay" options={PAYMENT_OPTIONS} value={pay} onChange={setPay} disabled={cashOk ? [] : ["cod"]} />
        {cashNote ? <Text className="-mt-2 px-1 text-[12px] leading-5 text-soft">{cashNote}</Text> : null}
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
        <TextInput multiline numberOfLines={2} value={note} onChangeText={setNote} maxLength={500} placeholder={t("checkout.notePh")} placeholderTextColor="#a9adb8" className="min-h-[64px] rounded-2xl border border-glass-line bg-white/60 p-3 text-[13px] text-ink" />

        <Glass strong className="gap-2.5 rounded-3xl p-4">
          <Row label={t("cart.subtotal")} value={money(subtotal)} />
          <Row label={t("cart.shipping")} value={money(shipping)} />
          <View className="my-1 h-px bg-white/70" />
          <Row label={t("common.total")} value={money(total)} big />
        </Glass>
        {error ? (
          <View className="rounded-2xl border border-red-200 bg-red-50 p-3">
            <Text className="text-[13px] leading-5 text-red-700">{error}</Text>
          </View>
        ) : null}
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
          disabled={lines.length === 0 || placing || !selected || (pay === "cod" && checking)}
          onPress={placeOrder}
          className={`min-w-[170px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#14141f] px-8 py-3.5 ${lines.length === 0 || placing || !selected || (pay === "cod" && checking) ? "opacity-70" : ""}`}
        >
          {placing ? <ActivityIndicator color="#fff" size="small" /> : null}
          <Text className="text-[14px] font-bold text-white">{placing ? t("checkout.processing") : t("checkout.place")}</Text>
        </Pressable>
      </ActionBar>
    </>
  );
}
