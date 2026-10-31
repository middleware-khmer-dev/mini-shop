import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { Header, Screen } from "@/components/Screen";
import { StatusBanner } from "@/components/StatusBanner";
import { useProducts } from "@/lib/products";
import { useI18n } from "@/lib/i18n";

export default function Catalog() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ cat?: string; focus?: string }>();
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const { products, categories } = useProducts();
  const [active, setActive] = useState(params.cat ?? "all");
  const [query, setQuery] = useState("");
  // 0 = default order, 1 = price low to high, 2 = price high to low
  const [sort, setSort] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (params.cat) setActive(params.cat);
  }, [params.cat]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = products.filter((p) => {
      if (active !== "all" && p.category !== active) return false;
      if (!q) return true;
      // match the name, the category (in the current language) and the description
      const hay = `${p.name} ${t(`cat.${p.category}`, { fallback: p.category ?? "" })} ${p.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    if (sort === 1) return [...out].sort((a, b) => a.price - b.price);
    if (sort === 2) return [...out].sort((a, b) => b.price - a.price);
    return out;
  }, [products, active, query, sort, t]);

  const chips = [{ id: "all", label: t("common.all") }, ...categories.map((c) => ({ id: c.id, label: t(`cat.${c.id}`, { fallback: c.id }) }))];

  return (
    <Screen
      header={
        <Header
          title={t("catalog.title")}
          left={<View className="h-10 w-10" />}
          right={<View className="h-10 w-10" />}
        />
      }
      contentClassName="gap-4 pt-4"
    >
      <Glass strong className="flex-row items-center gap-2 rounded-full px-4">
        <Icon name="search" size={16} color="#6b7280" />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder={t("catalog.search")}
          placeholderTextColor="#a9adb8"
          autoFocus={params.focus === "1"}
          returnKeyType="search"
          autoCorrect={false}
          // no browser focus rectangle inside the rounded pill
          style={{ outlineStyle: "none", outlineWidth: 0, minWidth: 0 } as never}
          className="min-w-0 flex-1 py-3 text-[13.5px] text-ink"
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityLabel={t("catalog.clear")}
            onPress={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="h-6 w-6 items-center justify-center rounded-full bg-black/10"
          >
            <Icon name="close" size={12} color="#374151" />
          </Pressable>
        ) : null}
      </Glass>

      <StatusBanner />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {chips.map((c) => (
          <Pressable key={c.id} onPress={() => setActive(c.id)} className={`rounded-full border px-4 py-2 ${active === c.id ? "border-white/35 bg-[#14141f]/85" : "border-glass-line bg-white/55"}`}>
            <Text className={`text-[12.5px] font-semibold ${active === c.id ? "text-white" : "text-ink"}`}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-between">
        <Text className="text-[12.5px] text-soft">{t("catalog.showing", { n: list.length })}</Text>
        <Pressable onPress={() => setSort(((sort + 1) % 3) as 0 | 1 | 2)} className="rounded-full border border-glass-line bg-white/55 px-3 py-1.5">
          <Text className="text-[12px] font-semibold text-ink">{sort === 1 ? t("catalog.sort") : sort === 2 ? t("catalog.sortDesc") : t("catalog.sortOff")}</Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <View className="items-center gap-1 py-16">
          <Icon name="search" size={36} color="#9ca3af" />
          <Text className="font-bold text-ink">{t("catalog.empty")}</Text>
          <Text className="text-[12.5px] text-soft">{t("catalog.emptySub")}</Text>
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
