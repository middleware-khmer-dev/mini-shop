import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "@/lib/products";

export type Line = { productId: number; qty: number; variant: string };

const KEY = "mini_shop_cart";

const isLine = (l: unknown): l is Line =>
  !!l && typeof (l as Line).productId === "number" && typeof (l as Line).qty === "number" && (l as Line).qty > 0;

type CartCtx = {
  lines: Line[];
  count: number;
  add: (productId: number, qty: number, variant?: string) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  subtotal: number;
  saved: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const loaded = useRef(false);

  // The cart survives a refresh / reopening the app: restore it, then keep it saved
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const stored = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(stored)) setLines((now) => (now.length ? now : stored.filter(isLine))); // keep anything added meanwhile
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines]);
  const { find: findProduct } = useProducts();

  const value = useMemo<CartCtx>(() => {
    let subtotal = 0;
    let saved = 0;
    let count = 0;
    for (const l of lines) {
      const p = findProduct(l.productId);
      if (!p) continue;
      subtotal += p.price * l.qty;
      if (p.oldPrice) saved += (p.oldPrice - p.price) * l.qty;
      count += l.qty;
    }
    return {
      lines,
      count,
      subtotal,
      saved,
      add: (productId, qty, variant = "") =>
        setLines((prev) => {
          const hit = prev.find((l) => l.productId === productId);
          if (hit) return prev.map((l) => (l === hit ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
          return [...prev, { productId, qty, variant }];
        }),
      setQty: (productId, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.productId !== productId)
            : prev.map((l) => (l.productId === productId ? { ...l, qty: Math.min(99, qty) } : l)),
        ),
      remove: (productId) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => setLines([]),
    };
  }, [lines, findProduct]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};

export const SHIPPING_DEFAULT = 1.5;
export const money = (n: number) => `$${n.toFixed(2)}`;
