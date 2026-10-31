import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiProduct, CATEGORY_ICONS, Product, fallbackProducts, fromApi } from "@/data/shop";

const PRODUCTS_URL = process.env.EXPO_PUBLIC_PRODUCTS_URL ?? "https://fakestoreapi.com/products";

export type Category = { id: string; icon: string };

type Ctx = {
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: boolean;
  /** true while showing the offline fallback data */
  offline: boolean;
  find: (id: number | string | undefined) => Product | undefined;
  reload: () => void;
};

const ProductsCtx = createContext<Ctx | null>(null);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    fetch(PRODUCTS_URL)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ApiProduct[]>;
      })
      .then((data) => {
        if (!alive || !Array.isArray(data) || data.length === 0) return;
        setProducts(data.map(fromApi));
        setOffline(false);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);

  const value = useMemo<Ctx>(() => {
    const ids = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];
    const categories = ids.map((id) => ({ id, icon: CATEGORY_ICONS[id] ?? "grid" }));
    return {
      products,
      categories,
      loading,
      error,
      offline,
      find: (id) => products.find((p) => p.id === Number(id)),
      reload: () => setTick((t) => t + 1),
    };
  }, [products, loading, error, offline]);

  return <ProductsCtx.Provider value={value}>{children}</ProductsCtx.Provider>;
}

export const useProducts = () => {
  const c = useContext(ProductsCtx);
  if (!c) throw new Error("useProducts outside ProductsProvider");
  return c;
};
