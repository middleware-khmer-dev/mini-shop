import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon, IconName } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { LangSwitch } from "@/components/LangSwitch";
import { Header, Screen } from "@/components/Screen";
import { StatusBanner } from "@/components/StatusBanner";
import { Product } from "@/data/shop";
import { useProducts } from "@/lib/products";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

function Grid({ items }: { items: Product[] }) {
  return (
    <View className="-mx-1.5 flex-row flex-wrap">
      {items.map((p) => (
        <View key={p.id} className="w-1/2 p-1.5 md:w-1/4">
          <ProductCard product={p} />
        </View>
      ))}
    </View>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { session } = useAuth();
  const { count } = useCart();
  const { products, categories } = useProducts();
  return (
    <Screen
      header={
        <Header
          left={
            <View>
              <Text className="text-[12.5px] text-white/85">{t("home.hello")}</Text>
              <Text className="text-[17px] font-bold text-white">{session?.user.name ?? t("common.guest")}</Text>
            </View>
          }
          right={
            <View className="flex-row items-center gap-2">
            <LangSwitch dark />
            <Pressable onPress={() => router.push("/cart")} accessibilityLabel={t("nav.cart")} className="h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Icon name="cart" size={18} color="#fff" />
              {count > 0 ? (
                <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-amber-300 px-1">
                  <Text className="text-[9.5px] font-extrabold text-amber-900">{count}</Text>
                </View>
              ) : null}
            </Pressable>
            </View>
          }
        />
      }
      contentClassName="gap-6 pt-4"
    >
      <Pressable onPress={() => router.push({ pathname: "/catalog", params: { focus: "1" } })}>
        <Glass strong className="flex-row items-center gap-3 rounded-full px-4 py-3">
          <Icon name="search" size={16} color="#6b7280" />
          <Text className="flex-1 text-[13.5px] text-soft">{t("home.search")}</Text>
          <Icon name="filter" size={15} color="#111" />
        </Glass>
      </Pressable>

      <StatusBanner />

      <LinearGradient colors={["rgba(120,90,255,0.8)", "rgba(255,90,170,0.65)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="min-h-[118px] justify-center gap-2 overflow-hidden rounded-3xl border border-white/50 p-5">
        <View className="self-start rounded-full bg-white/25 px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-white">{t("home.promoTag")}</Text>
        </View>
        <Text className="text-xl font-extrabold text-white">{t("home.promoTitle")}</Text>
        <Text className="text-[12.5px] text-white/85">{t("home.promoSub")}</Text>
      </LinearGradient>

      <View className="gap-3">
        <Text className="text-base font-bold text-ink">{t("home.categories")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
          {categories.map((c) => (
            <Pressable key={c.id} onPress={() => router.push({ pathname: "/catalog", params: { cat: c.id } })} className="w-16 items-center gap-1.5">
              <Glass className="h-14 w-14 items-center justify-center rounded-[18px]">
                <Icon name={c.icon as IconName} size={22} />
              </Glass>
              <Text numberOfLines={2} className="text-center text-[11px] text-soft">{t(`cat.${c.id}`, { fallback: c.id })}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-ink">{t("home.popular")}</Text>
          <Pressable onPress={() => router.push("/catalog")}><Text className="text-[12.5px] font-semibold text-ink">{t("common.viewAll")}</Text></Pressable>
        </View>
        <Grid items={products.slice(0, 4)} />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-ink">{t("home.new")}</Text>
          <Pressable onPress={() => router.push("/catalog")}><Text className="text-[12.5px] font-semibold text-ink">{t("common.viewAll")}</Text></Pressable>
        </View>
        <Grid items={products.slice(4, 8)} />
      </View>
    </Screen>
  );
}
