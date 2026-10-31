import React, { useRef, useState } from "react";
import { Image, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { Product } from "@/data/shop";
import { Media } from "./ProductCard";

/**
 * The product pictures. One picture: shown as before. Several (added by the admin): swipe through them,
 * with a counter and a row of thumbnails to jump to one.
 */
export function Gallery({ product }: { product: Product }) {
  const pics = product.images && product.images.length > 1 ? product.images : null;
  const [w, setW] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  if (!pics) {
    return (
      <View className="aspect-square w-full overflow-hidden rounded-3xl bg-white shadow-lg shadow-black/10">
        <Media product={product} className="flex-1" />
      </View>
    );
  }

  const go = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * w, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!w) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i !== index && i >= 0 && i < pics.length) setIndex(i);
  };

  return (
    <View className="gap-3">
      <View
        className="aspect-square w-full overflow-hidden rounded-3xl bg-white shadow-lg shadow-black/10"
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onScroll}
        >
          {pics.map((uri, i) => (
            <View key={`${uri}-${i}`} style={{ width: w || undefined, aspectRatio: 1 }} className="items-center justify-center bg-white p-3">
              <Image source={{ uri }} resizeMode="contain" accessibilityLabel={`${product.name} ${i + 1}`} style={{ width: "100%", height: "100%" }} />
            </View>
          ))}
        </ScrollView>
        <View pointerEvents="none" className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-1">
          <Text className="text-[11px] font-bold text-white">{index + 1} / {pics.length}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {pics.map((uri, i) => (
          <Pressable
            key={`t-${uri}-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`${i + 1}`}
            onPress={() => go(i)}
            className={`h-16 w-16 overflow-hidden rounded-xl bg-white p-1 ${i === index ? "border-2 border-[#14141f]" : "border border-black/10 opacity-80"}`}
          >
            <Image source={{ uri }} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
