import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { mediaColors, Product } from "@/data/shop";
import { useCart, money } from "@/lib/cart";
import { Glass } from "./Glass";
import { Icon } from "./Icon";

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
  const { add } = useCart();
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
          <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/80">
            <Icon name="heart" size={16} color="#9ca3af" />
          </View>
        </View>
        <View className="gap-1.5 p-3">
          <Text numberOfLines={2} className="min-h-[36px] text-[13px] font-semibold text-ink">
            {product.name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon name="star" size={12} color="#f59e0b" />
            <Text className="text-[11px] text-soft">
              {product.rating} · លក់ហើយ {product.sold}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <View>
              {product.oldPrice ? <Text className="text-[11px] text-soft line-through">{money(product.oldPrice)}</Text> : null}
              <Text className="text-base font-extrabold text-ink">{money(product.price)}</Text>
            </View>
            <Pressable
              accessibilityLabel="ដាក់ក្នុងកន្ត្រក"
              onPress={(e) => {
                e.stopPropagation();
                add(product.id, 1);
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
