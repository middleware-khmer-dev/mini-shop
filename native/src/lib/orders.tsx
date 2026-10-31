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
  payMethod: string; // cod | khqr | deposit (half by QR now, half in cash on delivery)
  customer: { name: string; phone: string };
  address: string;
  location?: { lat: number; lng: number }; // where the customer dropped the pin, if they did
  note?: string;
  qrImage?: string; // picture of the shop's payment QR, for orders paid by QR
  deposit?: number; // for "deposit" orders: the part paid up front
  paid?: number; // money the shop has received so far (set by the admin)
  token?: string; // secret that lets this device ask the server for the order status
  status?: string; // pending | confirmed | shipped | delivered | cancelled (from the server)
};

const KEY = "mini_shop_orders";

type Ctx = { orders: Order[]; addOrder: (o: Order) => void; setStatus: (id: string, status: string, paid?: number) => void; find: (id?: string) => Order | undefined };
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
  const setStatus = useCallback(
    (id: string, status: string, paid?: number) =>
      setOrders((prev) => prev.map((o) => (o.id === id && (o.status !== status || (paid !== undefined && o.paid !== paid)) ? { ...o, status, ...(paid !== undefined ? { paid } : {}) } : o))),
    [],
  );
  const value = useMemo<Ctx>(
    () => ({ orders, addOrder, setStatus, find: (id) => orders.find((o) => o.id === id) }),
    [orders, addOrder, setStatus],
  );
  return <OrdersCtx.Provider value={value}>{children}</OrdersCtx.Provider>;
}

export const useOrders = () => {
  const c = useContext(OrdersCtx);
  if (!c) throw new Error("useOrders outside OrdersProvider");
  return c;
};
