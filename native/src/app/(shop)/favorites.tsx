import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { Screen } from "@/components/Screen";
import { useFavorites } from "@/lib/favorites";
import { useI18n } from "@/lib/i18n";
import { useProducts } from "@/lib/products";

export default function Favorites() {
  const { t } = useI18n();
  const { ids } = useFavorites();
  const { find } = useProducts();
  const list = ids.map((id) => find(id)).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <Screen title={t("fav.title")} contentClassName="gap-4 pt-2">
      {list.length === 0 ? (
        <View className="items-center gap-2 py-16">
          <Icon name="heart" size={40} color="#9ca3af" />
          <Text className="font-bold text-ink">{t("fav.empty")}</Text>
          <Text className="text-center text-[12.5px] text-soft">{t("fav.emptySub")}</Text>
          <Pressable onPress={() => router.replace("/catalog")} className="mt-3 rounded-2xl bg-[#14141f] px-5 py-3">
            <Text className="font-bold text-white">{t("fav.browse")}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="-mx-1.5 flex-row flex-wrap">
          {list.map((p) => (
            <View key={p.id} className="w-1/2 p-1.5 md:w-1/4">
              <ProductCard product={p} />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
