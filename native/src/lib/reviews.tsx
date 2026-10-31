import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/data/shop";

export type Review = { id: string; productId: number; author: string; rating: number; text: string; createdAt: string };

const KEY = "mini_shop_reviews";

type Ctx = {
  reviewsFor: (productId: number) => Review[]; // newest first
  /** Add a review, or replace the one this author already wrote for the product. */
  submit: (r: { productId: number; author: string; rating: number; text: string }) => void;
  remove: (id: string) => void;
  /** Rating and count shown for a product: the catalog's own numbers plus the reviews written here. */
  stats: (p: Product) => { rating: number; count: number; label: string };
};

const ReviewsCtx = createContext<Ctx | null>(null);

const isReview = (r: unknown): r is Review =>
  !!r && typeof (r as Review).id === "string" && typeof (r as Review).productId === "number" && typeof (r as Review).rating === "number";

/** "1.2k" -> 1200, "120" -> 120 */
const baseCount = (sold: string) => {
  const m = /^([\d.]+)\s*(k?)$/i.exec(sold.trim());
  if (!m) return 0;
  return Math.round(Number(m[1]) * (m[2] ? 1000 : 1));
};

/** Customer reviews (stars + comment), kept on this device. */
export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Review[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const stored = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(stored)) setList((now) => (now.length ? now : stored.filter(isReview)));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  }, [list]);

  const reviewsFor = useCallback((productId: number) => list.filter((r) => r.productId === productId), [list]);

  const submit = useCallback<Ctx["submit"]>((r) => {
    const review: Review = {
      id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      productId: r.productId,
      author: r.author,
      rating: Math.min(5, Math.max(1, Math.round(r.rating))),
      text: r.text.trim().slice(0, 500),
      createdAt: new Date().toISOString(),
    };
    setList((prev) => [review, ...prev.filter((x) => !(x.productId === r.productId && x.author === r.author))]);
  }, []);

  const remove = useCallback((id: string) => setList((prev) => prev.filter((r) => r.id !== id)), []);

  const value = useMemo<Ctx>(
    () => ({
      reviewsFor,
      submit,
      remove,
      stats: (p) => {
        const mine = list.filter((r) => r.productId === p.id);
        if (mine.length === 0) return { rating: p.rating, count: baseCount(p.sold), label: p.sold };
        const base = baseCount(p.sold);
        const sum = p.rating * base + mine.reduce((s, r) => s + r.rating, 0);
        const count = base + mine.length;
        return { rating: Math.round((sum / count) * 10) / 10, count, label: String(count) };
      },
    }),
    [list, reviewsFor, submit, remove],
  );
  return <ReviewsCtx.Provider value={value}>{children}</ReviewsCtx.Provider>;
}

export const useReviews = () => {
  const c = useContext(ReviewsCtx);
  if (!c) throw new Error("useReviews outside ReviewsProvider");
  return c;
};
