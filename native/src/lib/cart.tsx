import React, { createContext, useContext, useMemo, useState } from "react";
import { findProduct } from "@/data/shop";

export type Line = { productId: number; qty: number; variant: string };

// Demo starting cart, same as the web version
const INITIAL: Line[] = [
  { productId: 2, qty: 1, variant: "ពណ៌ខ្មៅ" },
  { productId: 5, qty: 2, variant: "S · ស" },
];

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
  const [lines, setLines] = useState<Line[]>(INITIAL);

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
  }, [lines]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};

export const SHIPPING_DEFAULT = 1.5;
export const money = (n: number) => `$${n.toFixed(2)}`;
