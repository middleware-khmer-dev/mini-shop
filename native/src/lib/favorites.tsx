import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const KEY = "mini_shop_favorites";

type FavCtx = {
  ids: number[];
  has: (id: number) => boolean;
  toggle: (id: number) => boolean; // returns true when it is now a favorite
};

const Ctx = createContext<FavCtx | null>(null);

/** Favorite products (product ids), kept across refreshes and reopening the app. */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const stored = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(stored)) {
          const clean = stored.filter((x): x is number => typeof x === "number");
          setIds((now) => [...now, ...clean.filter((x) => !now.includes(x))]); // keep anything tapped meanwhile
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(ids)).catch(() => {});
  }, [ids]);

  const has = useCallback((id: number) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: number) => {
      const now = !ids.includes(id);
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
      return now;
    },
    [ids],
  );

  const value = useMemo(() => ({ ids, has, toggle }), [ids, has, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFavorites = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFavorites outside FavoritesProvider");
  return c;
};
