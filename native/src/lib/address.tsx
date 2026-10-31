import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Place } from "@/lib/geo";

export type AddressLabel = "home" | "work" | "other";
export type SavedAddress = { id: string; label: AddressLabel; address: string; place: Place | null };

const KEY = "mini_shop_addresses";
const OLD_KEY = "mini_shop_address"; // the single address saved by the first version

type Stored = { list: SavedAddress[]; selectedId: string | null };

type Ctx = {
  addresses: SavedAddress[];
  selected: SavedAddress | undefined; // the one used at checkout
  save: (a: Omit<SavedAddress, "id"> & { id?: string }) => string; // add or update, returns the id
  remove: (id: string) => void;
  select: (id: string) => void;
};

const AddressCtx = createContext<Ctx | null>(null);
const newId = () => `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

const isAddress = (a: unknown): a is SavedAddress =>
  !!a && typeof (a as SavedAddress).id === "string" && typeof (a as SavedAddress).address === "string";

/** The customer's saved delivery addresses (home, work, ...) and which one is used at checkout. */
export function AddressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Stored>({ list: [], selectedId: null });
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        let stored: Stored | null = null;
        if (raw) {
          const s = JSON.parse(raw) as Partial<Stored>;
          if (Array.isArray(s.list)) stored = { list: s.list.filter(isAddress), selectedId: s.selectedId ?? null };
        } else {
          // bring over the single address from the earlier version, if any
          const old = await AsyncStorage.getItem(OLD_KEY);
          const o = old ? (JSON.parse(old) as { address?: string; place?: Place | null }) : null;
          if (o?.address) {
            const id = newId();
            stored = { list: [{ id, label: "home", address: o.address, place: o.place ?? null }], selectedId: id };
          }
        }
        if (stored) setState((now) => (now.list.length ? now : stored!)); // keep anything added meanwhile
      } catch {}
      loaded.current = true;
    })();
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const save = useCallback((a: Omit<SavedAddress, "id"> & { id?: string }) => {
    const id = a.id ?? newId();
    const item: SavedAddress = { id, label: a.label, address: a.address, place: a.place };
    setState((s) => {
      const exists = s.list.some((x) => x.id === id);
      const list = exists ? s.list.map((x) => (x.id === id ? item : x)) : [...s.list, item];
      // the first address, or a newly added one, becomes the one used at checkout
      return { list, selectedId: exists ? s.selectedId ?? id : id };
    });
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    setState((s) => {
      const list = s.list.filter((x) => x.id !== id);
      return { list, selectedId: s.selectedId === id ? list[0]?.id ?? null : s.selectedId };
    });
  }, []);

  const select = useCallback((id: string) => setState((s) => ({ ...s, selectedId: id })), []);

  const value = useMemo<Ctx>(
    () => ({ addresses: state.list, selected: state.list.find((x) => x.id === state.selectedId) ?? state.list[0], save, remove, select }),
    [state, save, remove, select],
  );
  return <AddressCtx.Provider value={value}>{children}</AddressCtx.Provider>;
}

export const useAddresses = () => {
  const c = useContext(AddressCtx);
  if (!c) throw new Error("useAddresses outside AddressProvider");
  return c;
};
