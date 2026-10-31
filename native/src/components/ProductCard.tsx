import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { mediaColors, Product } from "@/data/shop";
import { useCart, money } from "@/lib/cart";
import { useReviews } from "@/lib/reviews";
import { useFavorites } from "@/lib/favorites";
import { haptic } from "@/lib/telegram";
import { Glass } from "./Glass";
import { Icon } from "./Icon";
import { useI18n } from "@/lib/i18n";

/** Product picture (API image on white) or a gradient placeholder when there is none. */
export function Media({ product, className = "" }: { product: Product; className?: string }) {
  if (product.image) {
    return (
      <View className={`items-center justify-center bg-white p-3 ${className}`}>
        <Image source={{ uri: product.image }} resizeMode="contain" accessibilityLabel={product.name} style={{ width: "100%", height: "100%" }} />
      </View>
    );
  }
  return <LinearGradient colors={mediaColors[product.media] ?? mediaColors[1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className={className} />;
}

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const { add } = useCart();
  const { has, toggle } = useFavorites();
  const fav = has(product.id);
  const { stats } = useReviews();
  const st = stats(product);
  return (
    <Pressable className="w-full" onPress={() => router.push(`/product/${product.id}`)}>
      <Glass className="rounded-2xl">
        <View className="aspect-square w-full">
          <Media product={product} className="flex-1" />
          {product.badge ? (
            <View className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5">
              <Text className="text-[11px] font-bold text-ink">{product.badge}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("product.wish")}
            accessibilityState={{ selected: fav }}
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              toggle(product.id);
              haptic();
            }}
            className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-white/90 active:scale-90"
          >
            <Icon name="heart" size={17} color={fav ? "#e11d48" : "#6b7280"} fill={fav ? "#e11d48" : "none"} />
          </Pressable>
        </View>
        <View className="gap-1.5 p-3">
          <Text numberOfLines={2} ellipsizeMode="tail" style={{ height: 40, lineHeight: 20, overflow: "hidden" }} className="text-[13px] font-semibold text-ink">
            {product.name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon name="star" size={12} color="#f59e0b" />
            <Text className="text-[11px] text-soft">
              {st.rating} · {t("card.reviews", { n: st.label })}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <View>
              {product.oldPrice ? <Text className="text-[11px] text-soft line-through">{money(product.oldPrice)}</Text> : null}
              <Text className="text-base font-extrabold text-ink">{money(product.price)}</Text>
            </View>
            <Pressable
              accessibilityLabel={t("card.add")}
              onPress={(e) => {
                e.stopPropagation();
                add(product.id, 1);
                haptic();
              }}
              className="h-8 w-8 items-center justify-center rounded-xl bg-ink active:scale-90"
            >
              <Icon name="plus" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}
