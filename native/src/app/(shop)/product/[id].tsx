import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { Gallery } from "@/components/Gallery";
import { Stars } from "@/components/Stars";
import { ActionBar, Screen } from "@/components/Screen";
import { useProducts } from "@/lib/products";
import { money, useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useReviews } from "@/lib/reviews";
import { useFavorites } from "@/lib/favorites";
import { haptic } from "@/lib/telegram";
import { useI18n } from "@/lib/i18n";

const SIZES = ["S", "M", "L", "XL"];
// The API files some bags/accessories under "clothing"; those have no sizes
const NOT_WEARABLE = /\b(backpack|bag|wallet|bracelet|necklace|ring|watch|earring)s?\b/i;

export default function ProductScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { find, products, categories } = useProducts();
  const product = find(id) ?? products[0];
  const { add } = useCart();
  const [size, setSize] = useState(1);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "reviews">("desc");
  const { has, toggle } = useFavorites();
  const wish = has(product.id);
  const [added, setAdded] = useState(false);
  const { session } = useAuth();
  const { reviewsFor, submit, remove, stats } = useReviews();
  const st = stats(product);
  const reviews = reviewsFor(product.id);
  const author = session?.user.name ?? "";
  const mine = author ? reviews.find((r) => r.author === author) : undefined;
  // the review form: starts from the customer's own review when they already wrote one
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setStars(mine?.rating ?? 0);
    setComment(mine?.text ?? "");
    setEditing(false);
  }, [product.id, mine?.id]);
  const sendReview = () => {
    if (!author || stars < 1) return;
    submit({ productId: product.id, author, rating: stars, text: comment });
    haptic("medium");
    setEditing(false);
  };

  const off = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const hasSizes = (product.category?.includes("clothing") ?? false) && !NOT_WEARABLE.test(product.name);
  const variant = hasSizes ? SIZES[size] : "";

  const addToCart = () => {
    add(product.id, qty, variant);
    haptic("medium");
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const buyNow = () => {
    add(product.id, qty, variant);
    router.push("/cart");
  };
  const circle = "h-11 w-11 items-center justify-center rounded-full border border-black/5 bg-white shadow-md shadow-black/25";

  return (
    <>
      <Screen withActionBar contentClassName="md:flex-row md:gap-10 md:pt-6">
        <View className="md:w-1/2">
          <Gallery product={product} />
          <View className="absolute inset-x-3 top-3 z-10 flex-row items-center justify-end md:hidden">
                        <View className="flex-row gap-2">
              <Pressable onPress={() => { toggle(product.id); haptic(); }} accessibilityLabel={t("product.wish")} className={circle}>
                <Icon name="heart" size={18} color={wish ? "#e11d48" : "#374151"} fill={wish ? "#e11d48" : "none"} />
              </Pressable>
              <Pressable accessibilityLabel={t("product.share")} className={circle}><Icon name="share" size={18} /></Pressable>
            </View>
          </View>
        </View>

        <Glass strong className="mt-3 gap-4 rounded-3xl p-5 md:mt-0 md:flex-1">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-white/70 px-2.5 py-1"><Text className="text-[11px] font-semibold text-ink">{t(`cat.${product.category}`, { fallback: product.category ?? "" })}</Text></View>
            {product.badge ? <View className="rounded-full bg-black px-2.5 py-1"><Text className="text-[11px] font-bold text-white">{product.badge}</Text></View> : null}
          </View>
          <Text className="text-xl font-bold text-ink">{product.name}</Text>
          <View className="flex-row items-center gap-1.5">
            <Icon name="star" size={14} color="#f59e0b" />
            <Text className="text-[13px] font-bold text-ink">{st.rating}</Text>
            <Text className="text-[12.5px] text-soft">  {t("card.reviews", { n: st.label })}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-[26px] font-extrabold text-ink">{money(product.price)}</Text>
            {product.oldPrice ? <Text className="text-sm text-soft line-through">{money(product.oldPrice)}</Text> : null}
            {off ? <View className="rounded-full bg-black px-2 py-0.5"><Text className="text-[11px] font-bold text-white">-{off}%</Text></View> : null}
          </View>

          {hasSizes ? (
          <View className="gap-2">
            <Text className="text-sm font-bold text-ink">{t("product.size")}</Text>
            <View className="flex-row gap-2">
              {SIZES.map((s, i) => (
                <Pressable key={s} onPress={() => setSize(i)} className={`min-w-11 items-center rounded-xl border px-3 py-2 ${size === i ? "border-white/35 bg-[#14141f]/85" : "border-glass-line bg-white/70"}`}>
                  <Text className={`text-[13px] font-bold ${size === i ? "text-white" : "text-ink"}`}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          ) : null}

          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-ink">{t("product.qty")}</Text>
            <View className="flex-row items-center rounded-xl bg-white/80">
              <Pressable onPress={() => setQty(Math.max(1, qty - 1))} className="h-9 w-9 items-center justify-center"><Icon name="minus" size={16} /></Pressable>
              <Text className="w-8 text-center text-sm font-bold text-ink">{qty}</Text>
              <Pressable onPress={() => setQty(Math.min(99, qty + 1))} className="h-9 w-9 items-center justify-center"><Icon name="plus" size={16} /></Pressable>
            </View>
          </View>

          <View className="flex-row gap-5 border-b border-white/60">
            {([["desc", t("product.details")], ["reviews", t("product.reviewsTab", { n: st.count })]] as const).map(([k, label]) => (
              <Pressable key={k} onPress={() => setTab(k)} className={`pb-2 ${tab === k ? "border-b-2 border-ink" : ""}`}>
                <Text className={`text-[13px] font-semibold ${tab === k ? "text-ink" : "text-soft"}`}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {tab === "desc" ? (
            <Text className="text-[13px] leading-6 text-soft">{product.description ?? ""}</Text>
          ) : (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-[22px] font-extrabold text-ink">{st.rating}</Text>
                <View className="gap-0.5">
                  <Stars value={st.rating} size={14} />
                  <Text className="text-[12px] text-soft">{t("card.reviews", { n: st.label })}</Text>
                </View>
              </View>

              {!session ? (
                <Pressable onPress={() => router.push(`/login?redirect=/product/${product.id}`)} className="items-center rounded-xl bg-[#14141f] py-3">
                  <Text className="text-[13px] font-bold text-white">{t("review.signIn")}</Text>
                </Pressable>
              ) : mine && !editing ? (
                <View className="flex-row gap-2">
                  <Pressable onPress={() => setEditing(true)} className="flex-1 items-center rounded-xl border border-glass-line bg-white/70 py-2.5">
                    <Text className="text-[12.5px] font-bold text-ink">{t("review.edit")}</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(mine.id)} className="flex-1 items-center rounded-xl border border-glass-line bg-white/70 py-2.5">
                    <Text className="text-[12.5px] font-bold text-red-500">{t("review.delete")}</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="gap-2 rounded-2xl border border-glass-line bg-white/60 p-3">
                  <Text className="text-[13px] font-bold text-ink">{mine ? t("review.edit") : t("review.write")}</Text>
                  <Stars value={stars} onChange={setStars} size={28} />
                  <TextInput
                    multiline
                    value={comment}
                    onChangeText={setComment}
                    maxLength={500}
                    placeholder={t("review.placeholder")}
                    placeholderTextColor="#a9adb8"
                    style={{ outlineStyle: "none", outlineWidth: 0 } as never}
                    className="min-h-[72px] rounded-xl border border-glass-line bg-white/70 p-3 text-[13px] leading-5 text-ink"
                  />
                  <Pressable disabled={stars < 1} onPress={sendReview} className={`items-center rounded-xl bg-[#14141f] py-3 ${stars < 1 ? "opacity-50" : ""}`}>
                    <Text className="text-[13px] font-bold text-white">{stars < 1 ? t("review.pickStars") : t("review.submit")}</Text>
                  </Pressable>
                </View>
              )}

              {reviews.length === 0 ? (
                <Text className="text-[13px] text-soft">{t("review.empty")}</Text>
              ) : (
                reviews.map((r) => (
                  <View key={r.id} className="gap-1 border-t border-white/60 pt-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[13px] font-bold text-ink">{r.author}</Text>
                      <Text className="text-[11px] text-soft">{new Date(r.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <Stars value={r.rating} size={12} />
                    {r.text ? <Text className="text-[13px] leading-5 text-ink">{r.text}</Text> : null}
                  </View>
                ))
              )}
            </View>
          )}
        </Glass>
      </Screen>

      <ActionBar>
        {/* one row, three equal-height items: price | add to cart | buy now */}
        <View className="w-[88px] justify-center">
          <Text className="text-[11px] text-soft">{t("common.total")}</Text>
          <Text numberOfLines={1} className="text-[17px] font-extrabold text-ink">{money(product.price * qty)}</Text>
        </View>
        <Pressable onPress={addToCart} className="h-12 flex-1 items-center justify-center rounded-2xl border border-black/15 bg-white px-2">
          <Text numberOfLines={2} className="text-center text-[13px] font-bold leading-4 text-ink">{added ? t("product.added") : t("card.add")}</Text>
        </Pressable>
        <Pressable onPress={buyNow} className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#14141f] px-2">
          <Text numberOfLines={2} className="text-center text-[13px] font-bold leading-4 text-white">{t("product.buyNow")}</Text>
        </Pressable>
      </ActionBar>
    </>
  );
}
