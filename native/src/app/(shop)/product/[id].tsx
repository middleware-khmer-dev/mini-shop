import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { Media } from "@/components/ProductCard";
import { ActionBar, Screen } from "@/components/Screen";
import { findProduct, products } from "@/data/shop";
import { money, useCart } from "@/lib/cart";

const COLORS = ["#2a2f3a", "#ff7a45", "#4a8cff", "#e5e7eb"];
const SIZES = ["S", "M", "L", "XL"];

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = findProduct(id) ?? products[0];
  const { add } = useCart();
  const [color, setColor] = useState(0);
  const [size, setSize] = useState(1);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "reviews">("desc");
  const [wish, setWish] = useState(false);
  const [added, setAdded] = useState(false);

  const off = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const variant = `${SIZES[size]}`;

  const addToCart = () => {
    add(product.id, qty, variant);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const circle = "h-10 w-10 items-center justify-center rounded-full bg-white/85";

  return (
    <>
      <Screen withActionBar contentClassName="md:flex-row md:gap-10 md:pt-6">
        <View className="md:w-1/2">
          <View className="aspect-square w-full overflow-hidden md:rounded-3xl">
            <Media media={product.media} className="flex-1" />
          </View>
          <View className="absolute inset-x-3 top-3 flex-row items-center justify-between md:hidden">
            <Pressable onPress={() => router.back()} accessibilityLabel="ត្រឡប់ក្រោយ" className={circle}><Icon name="back" size={18} /></Pressable>
            <Pressable accessibilityLabel="ចែករំលែក" className={circle}><Icon name="share" size={18} /></Pressable>
          </View>
        </View>

        <Glass strong className="-mt-5 gap-4 rounded-t-3xl p-5 md:mt-0 md:flex-1 md:rounded-3xl">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-white/70 px-2.5 py-1"><Text className="text-[11px] font-semibold text-ink">អេឡិចត្រូនិច</Text></View>
            {product.badge ? <View className="rounded-full bg-black px-2.5 py-1"><Text className="text-[11px] font-bold text-white">{product.badge}</Text></View> : null}
          </View>
          <Text className="text-xl font-bold text-ink">{product.name}</Text>
          <View className="flex-row items-center gap-1.5">
            <Icon name="star" size={14} color="#f59e0b" />
            <Text className="text-[13px] font-bold text-ink">{product.rating}</Text>
            <Text className="text-[12.5px] text-soft">  លក់ហើយ {product.sold}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-[26px] font-extrabold text-ink">{money(product.price)}</Text>
            {product.oldPrice ? <Text className="text-sm text-soft line-through">{money(product.oldPrice)}</Text> : null}
            {off ? <View className="rounded-full bg-black px-2 py-0.5"><Text className="text-[11px] font-bold text-white">-{off}%</Text></View> : null}
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-ink">ពណ៌</Text>
            <View className="flex-row gap-2.5">
              {COLORS.map((c, i) => (
                <Pressable key={c} onPress={() => setColor(i)} style={{ backgroundColor: c }} className={`h-10 w-10 rounded-xl border-2 ${color === i ? "border-ink" : "border-white"}`} />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-ink">ទំហំ</Text>
            <View className="flex-row gap-2">
              {SIZES.map((s, i) => (
                <Pressable key={s} onPress={() => setSize(i)} className={`min-w-11 items-center rounded-xl border px-3 py-2 ${size === i ? "border-white/35 bg-[#14141f]/85" : "border-glass-line bg-white/70"}`}>
                  <Text className={`text-[13px] font-bold ${size === i ? "text-white" : "text-ink"}`}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-ink">ចំនួន</Text>
            <View className="flex-row items-center rounded-xl bg-white/80">
              <Pressable onPress={() => setQty(Math.max(1, qty - 1))} className="h-9 w-9 items-center justify-center"><Icon name="minus" size={16} /></Pressable>
              <Text className="w-8 text-center text-sm font-bold text-ink">{qty}</Text>
              <Pressable onPress={() => setQty(Math.min(99, qty + 1))} className="h-9 w-9 items-center justify-center"><Icon name="plus" size={16} /></Pressable>
            </View>
          </View>

          <View className="flex-row gap-5 border-b border-white/60">
            {([["desc", "ព័ត៌មានលម្អិត"], ["reviews", "មតិវាយតម្លៃ (128)"]] as const).map(([k, label]) => (
              <Pressable key={k} onPress={() => setTab(k)} className={`pb-2 ${tab === k ? "border-b-2 border-ink" : ""}`}>
                <Text className={`text-[13px] font-semibold ${tab === k ? "text-ink" : "text-soft"}`}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {tab === "desc" ? (
            <Text className="text-[13px] leading-6 text-soft">ផលិតផលគុណភាពខ្ពស់ រចនាស្អាតសម្រាប់ការប្រើប្រាស់ប្រចាំថ្ងៃ។ សម្ភារៈមានម៉ាត់ត្រូវបានចម្រើនសុវត្ថិភាព និងដឹកជញ្ជូនលឿន។ មានការធានារយៈពេល ១២ខែ និងអាចប្តូរ/សងវិញបាននៅក្នុងរយៈពេល ៧ថ្ងៃ ប្រសិនបើមានបញ្ហាពីរោងចក្រ។</Text>
          ) : (
            <View className="gap-1">
              <Text className="text-[13px] font-bold text-ink">⭐ {product.rating} / 5</Text>
              <Text className="text-[13px] text-soft">ទំនិញល្អ ដឹកលឿន ស្អាតដូចរូប។ ណែនាំឱ្យទិញ!</Text>
            </View>
          )}
        </Glass>
      </Screen>

      <ActionBar>
        <Pressable onPress={() => setWish(!wish)} accessibilityLabel="ចូលចិត្ត" className="h-12 w-12 items-center justify-center rounded-2xl bg-white/70">
          <Icon name="heart" size={20} color={wish ? "#e11d48" : "#6b7280"} fill={wish ? "#e11d48" : "none"} />
        </Pressable>
        <Pressable onPress={addToCart} className="h-12 flex-1 items-center justify-center rounded-2xl border border-glass-line bg-white/80">
          <Text className="text-[13.5px] font-bold text-ink">{added ? "បានដាក់ក្នុងកន្ត្រក ✓" : "ដាក់ក្នុងកន្ត្រក"}</Text>
        </Pressable>
        <Pressable onPress={() => { add(product.id, qty, variant); router.push("/cart"); }} className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#14141f]">
          <Text className="text-[13.5px] font-bold text-white">ទិញឥឡូវនេះ</Text>
        </Pressable>
      </ActionBar>
    </>
  );
}
