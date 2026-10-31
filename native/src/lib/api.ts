import type { Order } from "@/lib/orders";

/** Where orders are placed (see cloudflare/api-worker). Empty = orders only stay on this device. */
export const ORDERS_API = (process.env.EXPO_PUBLIC_ORDERS_API ?? "").replace(/\/$/, "");

export type PlaceOrderInput = {
  items: { productId: number; qty: number; variant: string }[];
  shippingId: string;
  payMethod: string;
  customer: { name: string; phone: string };
  address: string;
  location?: { lat: number; lng: number };
  note?: string;
};

export type PlacedOrder = Pick<Order, "id" | "createdAt" | "items" | "subtotal" | "shipping" | "total"> & { token: string; status: string };

export class OrderError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function call<T>(path: string, init: RequestInit, ms = 15_000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(`${ORDERS_API}${path}`, { ...init, signal: ctl.signal });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new OrderError(data.error ?? `http_${res.status}`);
    return data;
  } catch (e) {
    if (e instanceof OrderError) throw e;
    throw new OrderError("network"); // offline, timeout, blocked
  } finally {
    clearTimeout(timer);
  }
}

/** Place the order on the server. The server prices it from its own product list. */
export const placeOrder = (input: PlaceOrderInput) =>
  call<PlacedOrder>("/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });

/** Current status of an order (needs the token returned when it was placed). */
export const fetchOrderStatus = (id: string, token: string) =>
  call<{ id: string; status: string }>(`/orders/${encodeURIComponent(id)}`, { headers: { "X-Order-Token": token } }, 10_000);
