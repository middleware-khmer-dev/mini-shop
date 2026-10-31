// Shop settings (set in the admin page): where the shop is, how far it delivers for cash, and the QR picture to pay to.
export const DEFAULT_SETTINGS = { shop: { lat: 11.5564, lng: 104.9282 }, radiusKm: 25, qrImage: "" }; // Phnom Penh until set

export async function loadSettings(env) {
  try {
    const s = JSON.parse((await env.DATA.get("settings")) || "{}");
    return {
      shop: Number.isFinite(s?.shop?.lat) && Number.isFinite(s?.shop?.lng) ? { lat: s.shop.lat, lng: s.shop.lng } : DEFAULT_SETTINGS.shop,
      radiusKm: Number.isFinite(s?.radiusKm) && s.radiusKm > 0 ? s.radiusKm : DEFAULT_SETTINGS.radiusKm,
      qrImage: typeof s?.qrImage === "string" ? s.qrImage : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Check what the admin sends for the settings; returns { error } or { settings }. */
export function cleanSettings(input, origin) {
  const lat = Number(input?.shop?.lat);
  const lng = Number(input?.shop?.lng);
  const radiusKm = Number(input?.radiusKm);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) return { error: "bad_location" };
  if (!Number.isFinite(radiusKm) || radiusKm < 0.5 || radiusKm > 1000) return { error: "bad_radius" };
  const qr = typeof input?.qrImage === "string" ? input.qrImage.trim() : "";
  if (qr && !(/^https:\/\/[^\s]{1,480}$/.test(qr) || qr.startsWith(`${origin}/img/`))) return { error: "bad_qr" };
  return { settings: { shop: { lat, lng }, radiusKm: Math.round(radiusKm * 10) / 10, qrImage: qr } };
}

/** Straight-line distance in km between two points (haversine). */
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Orders. The shop app places an order (POST /orders); the Worker works out every price itself from its own
// product list, so a customer cannot change what they pay. Admins list orders and change their status.

const ALLOWED_ORIGINS = ["https://middleware-khmer-dev.github.io"];
const SHIPPING = { standard: 1.5, express: 4 }; // keep in step with SHIPPING_OPTIONS in the app
const PAYMENTS = ["cod", "khqr"]; // cash on delivery (only near the shop) or QR
export const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers } });

const cors = (origin) =>
  ALLOWED_ORIGINS.includes(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type, x-order-token", vary: "Origin" }
    : { vary: "Origin" };

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const money = (n) => Math.round(n * 100) / 100;

async function sameSecret(a, b) {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [x, y] = (await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))])).map((d) => new Uint8Array(d));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Check what the app sent and price it from our own products. Returns { error } or { order }. */
function buildOrder(input, products, settings) {
  if (!input || typeof input !== "object") return { error: "bad_request" };
  const name = str(input.customer?.name, 100);
  const phone = str(input.customer?.phone, 30);
  const address = str(input.address, 500);
  if (!name) return { error: "name_required" };
  if (!/^[0-9+\-\s()]{5,30}$/.test(phone)) return { error: "bad_phone" };
  if (!address) return { error: "address_required" };
  if (!(input.shippingId in SHIPPING)) return { error: "bad_shipping" };
  if (!PAYMENTS.includes(input.payMethod)) return { error: "bad_payment" };
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) return { error: "bad_items" };

  const byId = new Map(products.map((p) => [p.id, p]));
  const items = [];
  for (const it of input.items) {
    const p = byId.get(Number(it?.productId));
    const qty = Number(it?.qty);
    if (!p) return { error: "unknown_product" };
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return { error: "bad_quantity" };
    items.push({ productId: p.id, name: p.title, price: p.price, qty, variant: str(it.variant, 20) });
  }
  let lat = null;
  let lng = null;
  if (input.location && Number.isFinite(Number(input.location.lat)) && Number.isFinite(Number(input.location.lng))) {
    lat = Number(input.location.lat);
    lng = Number(input.location.lng);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      lat = null;
      lng = null;
    }
  }
  // cash is only for deliveries within the radius around the shop; farther (or unknown) places pay by QR
  if (input.payMethod === "cod" && (lat == null || distanceKm(settings.shop, { lat, lng }) > settings.radiusKm)) return { error: "cash_not_allowed" };
  const subtotal = money(items.reduce((s, i) => s + i.price * i.qty, 0));
  const shipping = SHIPPING[input.shippingId];
  return { order: { name, phone, address, lat, lng, note: str(input.note, 500), shipId: input.shippingId, payMethod: input.payMethod, items, subtotal, shipping, total: money(subtotal + shipping) } };
}

const view = (r) => ({
  id: r.id,
  createdAt: r.created_at,
  status: r.status,
  customer: { name: r.customer_name, phone: r.phone },
  address: r.address,
  location: r.lat == null || r.lng == null ? null : { lat: r.lat, lng: r.lng },
  note: r.note,
  shippingId: r.ship_id,
  payMethod: r.pay_method,
  subtotal: r.subtotal,
  shipping: r.shipping,
  total: r.total,
  items: JSON.parse(r.items),
});

/** Public routes: POST /orders (place) and GET /orders/<id> (status, needs the order's token). */
export async function publicOrders(request, env, url, loadProducts) {
  const origin = request.headers.get("origin") || "";
  const h = cors(origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  if (request.method === "POST" && url.pathname === "/orders") {
    if (!ALLOWED_ORIGINS.includes(origin)) return json(403, { error: "origin_not_allowed" }, h);
    if (env.ORDER_LIMITER) {
      const { success } = await env.ORDER_LIMITER.limit({ key: request.headers.get("cf-connecting-ip") || "unknown" });
      if (!success) return json(429, { error: "too_many_requests" }, h);
    }
    if (Number(request.headers.get("content-length") || 0) > 20_000) return json(413, { error: "too_large" }, h);
    const input = await request.json().catch(() => null);
    const settings = await loadSettings(env);
    const { error, order } = buildOrder(input, await loadProducts(env), settings);
    if (error) return json(400, { error }, h);

    const token = hex(crypto.getRandomValues(new Uint8Array(16)));
    const createdAt = new Date().toISOString();
    for (let tries = 0; tries < 6; tries++) {
      const id = `MS${100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)}`;
      try {
        await env.DB.prepare(
          "INSERT INTO orders (id, token, created_at, status, customer_name, phone, address, lat, lng, note, ship_id, pay_method, subtotal, shipping, total, items) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(id, token, createdAt, order.name, order.phone, order.address, order.lat, order.lng, order.note, order.shipId, order.payMethod, order.subtotal, order.shipping, order.total, JSON.stringify(order.items))
          .run();
        return json(200, { id, token, createdAt, status: "pending", items: order.items, subtotal: order.subtotal, shipping: order.shipping, total: order.total, ...(order.payMethod === "khqr" && settings.qrImage ? { qrImage: settings.qrImage } : {}) }, h);
      } catch (e) {
        if (!/UNIQUE|constraint/i.test(String(e?.message))) return json(500, { error: "could_not_save" }, h);
      }
    }
    return json(500, { error: "could_not_save" }, h);
  }

  // POST /quote { location } -> may this place pay cash? (the shop's own location stays private)
  if (request.method === "POST" && url.pathname === "/orders/quote") {
    if (!ALLOWED_ORIGINS.includes(origin)) return json(403, { error: "origin_not_allowed" }, h);
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: `quote:${request.headers.get("cf-connecting-ip") || "unknown"}` });
      if (!success) return json(429, { error: "too_many_requests" }, h);
    }
    const body = await request.json().catch(() => null);
    const lat = Number(body?.location?.lat);
    const lng = Number(body?.location?.lng);
    const settings = await loadSettings(env);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json(200, { cashAllowed: false, radiusKm: settings.radiusKm, distanceKm: null }, h);
    const km = distanceKm(settings.shop, { lat, lng });
    return json(200, { cashAllowed: km <= settings.radiusKm, radiusKm: settings.radiusKm, distanceKm: Math.round(km * 10) / 10 }, h);
  }

  const m = url.pathname.match(/^\/orders\/(MS\d{6})$/);
  if (request.method === "GET" && m) {
    const row = await env.DB.prepare("SELECT id, token, status, created_at, total FROM orders WHERE id = ?").bind(m[1]).first();
    // the same answer whether the order is missing or the token is wrong
    if (!row || !(await sameSecret(request.headers.get("x-order-token") || "", row.token))) return json(404, { error: "not_found" }, h);
    return json(200, { id: row.id, status: row.status, createdAt: row.created_at, total: row.total }, h);
  }
  return json(404, { error: "not_found" }, h);
}

/** Admin: GET /orders (optionally ?status=) and PATCH /orders/<id> { status }. */
export async function adminOrders(request, env, path, url) {
  if (request.method === "GET" && path === "/orders") {
    const status = url.searchParams.get("status");
    const { results } = status && STATUSES.includes(status)
      ? await env.DB.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status).all()
      : await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200").all();
    return json(200, results.map(view));
  }
  const m = path.match(/^\/orders\/(MS\d{6})$/);
  if (m && request.method === "PATCH") {
    const body = await request.json().catch(() => null);
    if (!STATUSES.includes(body?.status)) return json(400, { error: "bad_status" });
    const r = await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(body.status, m[1]).run();
    if (!r.meta?.changes) return json(404, { error: "not_found" });
    const row = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(m[1]).first();
    return json(200, view(row));
  }
  return null;
}
