import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type OrderItem = { productId: number; name: string; price: number; qty: number; variant: string };

/** A placed order; items are a snapshot so the invoice stays right even if the catalog changes. */
export type Order = {
  id: string; // e.g. MS268420
  createdAt: string; // ISO
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  shippingId: string;
  total: number;
  payMethod: string; // cod | khqr | card
  customer: { name: string; phone: string };
  address: string;
};

const KEY = "mini_shop_orders";

type Ctx = { orders: Order[]; addOrder: (o: Order) => void; find: (id?: string) => Order | undefined };
const OrdersCtx = createContext<Ctx | null>(null);

export const newOrderId = () => `MS${Math.floor(100000 + Math.random() * 900000)}`;

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const stored = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(stored)) setOrders((now) => (now.length ? now : (stored as Order[])));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(orders.slice(0, 50))).catch(() => {});
  }, [orders]);

  const addOrder = useCallback((o: Order) => setOrders((prev) => [o, ...prev]), []);
  const value = useMemo<Ctx>(
    () => ({ orders, addOrder, find: (id) => orders.find((o) => o.id === id) }),
    [orders, addOrder],
  );
  return <OrdersCtx.Provider value={value}>{children}</OrdersCtx.Provider>;
}

export const useOrders = () => {
  const c = useContext(OrdersCtx);
  if (!c) throw new Error("useOrders outside OrdersProvider");
  return c;
};
