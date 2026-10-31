// Mini Shop backend: the products API the app reads, plus a small admin site to manage products and pictures.
//   GET  /products                 public   products in the same shape as fakestoreapi.com, plus `images`
//   GET  /img/<id>                 public   a picture an admin uploaded
//   POST /orders, GET /orders/<id> the shop app places an order / checks its status (see orders.js)
//   GET  /admin                    the admin page (asks for the password)
//   *    /admin/api/...            needs  Authorization: Bearer <ADMIN_PASSWORD>
// Data: the product list is one KV key ("products"); the pictures are objects in an R2 bucket (binding IMAGES);
// orders are rows in a D1 database (binding DB).

import { ADMIN_HTML, ADMIN_JS } from "./admin.js";
import { adminOrders, publicOrders } from "./orders.js";

const MAX_IMAGE_BYTES = 2_000_000;
const MAX_PRODUCTS = 500;
const MAX_IMAGES_PER_PRODUCT = 12;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Does the file start like the image type it claims to be? */
function looksLike(type, b) {
  const at = (i, ...v) => v.every((x, k) => b[i + k] === x);
  if (type === "image/jpeg") return at(0, 0xff, 0xd8, 0xff);
  if (type === "image/png") return at(0, 0x89, 0x50, 0x4e, 0x47);
  if (type === "image/gif") return at(0, 0x47, 0x49, 0x46, 0x38);
  if (type === "image/webp") return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
  return false;
}

const SECURITY = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

const reply = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...SECURITY, ...headers } });

const PUBLIC_CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "content-type" };

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** Compare the password without leaking where it differs. */
async function passwordOk(given, expected) {
  if (!expected || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(given)), crypto.subtle.digest("SHA-256", enc.encode(expected))]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function loadProducts(env) {
  const raw = await env.DATA.get("products");
  try {
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const saveProducts = (env, list) => env.DATA.put("products", JSON.stringify(list));

/** What the app receives (same field names as fakestoreapi.com, plus `images`). */
const publicShape = (p) => ({
  id: p.id,
  title: p.title,
  price: p.price,
  description: p.description,
  category: p.category,
  image: p.images[0] ?? "",
  images: p.images,
  rating: p.rating,
});

const isHttps = (u) => typeof u === "string" && /^https:\/\/[^\s]+$/.test(u) && u.length <= 500;
/** An https picture link, or one of this server's own pictures. */
const isPicture = (u, origin) => isHttps(u) || (typeof u === "string" && u.length <= 500 && u.startsWith(`${origin}/img/`));

/** Check and clean what an admin sends; returns { error } or { product }. */
function cleanProduct(input, origin) {
  const title = typeof input?.title === "string" ? input.title.trim().slice(0, 200) : "";
  if (!title) return { error: "title_required" };
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return { error: "bad_price" };
  const category = typeof input.category === "string" ? input.category.trim().slice(0, 60) : "";
  if (!category) return { error: "category_required" };
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 5000) : "";
  const images = Array.isArray(input.images) ? input.images.filter((u) => isPicture(u, origin)).slice(0, MAX_IMAGES_PER_PRODUCT) : [];
  const rate = Number(input.rating?.rate);
  const count = Number(input.rating?.count);
  const rating = { rate: Number.isFinite(rate) ? Math.min(5, Math.max(0, rate)) : 0, count: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0 };
  return { product: { title, price: Math.round(price * 100) / 100, category, description, images: [...new Set(images)], rating } };
}

/** Pictures we host are removed when no product uses them any more. */
async function dropUnusedImages(env, origin, before, after) {
  const keep = new Set(after);
  const prefix = `${origin}/img/`;
  await Promise.all(
    before
      .filter((u) => u.startsWith(prefix) && !keep.has(u))
      .map((u) => {
        const id = u.slice(prefix.length);
        return /^[a-f0-9]{32}$/.test(id) ? env.IMAGES.delete(id) : null;
      }),
  );
}

async function admin(request, env, url) {
  const auth = request.headers.get("authorization") || "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (env.LIMITER) {
    const { success } = await env.LIMITER.limit({ key: request.headers.get("cf-connecting-ip") || "unknown" });
    if (!success) return reply(429, { error: "too_many_requests" });
  }
  if (!(await passwordOk(given, env.ADMIN_PASSWORD))) return reply(401, { error: "unauthorized" });

  const path = url.pathname.replace(/^\/admin\/api/, "");
  const origin = url.origin;

  if (path === "/orders" || path.startsWith("/orders/")) {
    const res = await adminOrders(request, env, path, url);
    if (res) return res;
  }

  if (request.method === "GET" && path === "/products") return reply(200, await loadProducts(env));

  if (request.method === "POST" && path === "/images") {
    const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!IMAGE_TYPES.includes(type)) return reply(415, { error: "unsupported_type" });
    if (Number(request.headers.get("content-length") || 0) > MAX_IMAGE_BYTES) return reply(413, { error: "too_large" });
    const body = await request.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_IMAGE_BYTES) return reply(413, { error: "too_large" });
    if (!looksLike(type, new Uint8Array(body.slice(0, 12)))) return reply(415, { error: "not_an_image" });
    const id = hex(crypto.getRandomValues(new Uint8Array(16)));
    await env.IMAGES.put(id, body, { httpMetadata: { contentType: type } });
    return reply(200, { url: `${origin}/img/${id}` });
  }

  if (request.method === "POST" && path === "/products") {
    const { error, product } = cleanProduct(await request.json().catch(() => null), origin);
    if (error) return reply(400, { error });
    const list = await loadProducts(env);
    if (list.length >= MAX_PRODUCTS) return reply(400, { error: "too_many_products" });
    const created = { id: list.reduce((m, p) => Math.max(m, p.id), 0) + 1, ...product };
    await saveProducts(env, [...list, created]);
    return reply(200, created);
  }

  const m = path.match(/^\/products\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const list = await loadProducts(env);
    const old = list.find((p) => p.id === id);
    if (!old) return reply(404, { error: "not_found" });
    if (request.method === "PUT") {
      const { error, product } = cleanProduct(await request.json().catch(() => null), origin);
      if (error) return reply(400, { error });
      const updated = { id, ...product };
      await saveProducts(env, list.map((p) => (p.id === id ? updated : p)));
      await dropUnusedImages(env, origin, old.images, updated.images);
      return reply(200, updated);
    }
    if (request.method === "DELETE") {
      await saveProducts(env, list.filter((p) => p.id !== id));
      await dropUnusedImages(env, origin, old.images, []);
      return reply(200, { ok: true });
    }
  }

  return reply(404, { error: "not_found" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/orders" || url.pathname.startsWith("/orders/")) return publicOrders(request, env, url, loadProducts);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: PUBLIC_CORS });

    if (request.method === "GET" && url.pathname === "/products") {
      const list = await loadProducts(env);
      return reply(200, list.map(publicShape), { ...PUBLIC_CORS, "cache-control": "public, max-age=30" });
    }

    const img = url.pathname.match(/^\/img\/([a-f0-9]{32})$/);
    if (request.method === "GET" && img) {
      const obj = await env.IMAGES.get(img[1]);
      if (!obj) return reply(404, { error: "not_found" }, PUBLIC_CORS);
      const type = IMAGE_TYPES.includes(obj.httpMetadata?.contentType) ? obj.httpMetadata.contentType : "application/octet-stream";
      return new Response(obj.body, { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable", ...PUBLIC_CORS, ...SECURITY } });
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return new Response(ADMIN_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy":
            "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' blob: data: https:; connect-src 'self' https://fakestoreapi.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
          ...SECURITY,
        },
      });
    }
    if (url.pathname === "/admin/app.js") {
      return new Response(ADMIN_JS, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store", ...SECURITY } });
    }
    if (url.pathname.startsWith("/admin/api/")) return admin(request, env, url);

    return reply(404, { error: "not_found" });
  },
};
