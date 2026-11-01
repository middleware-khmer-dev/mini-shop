"""Mini Shop backend (Python / FastAPI). Same API as the old Cloudflare Workers:

  GET  /products                 public   products in the same shape as fakestoreapi.com, plus `images`
  GET  /img/<id>                 public   a picture an admin uploaded
  POST /orders/quote             the shop app: may this pin pay cash? delivery fees
  POST /orders, GET /orders/<id> the shop app places an order / checks its status
  POST /invoice, GET /invoice/<id>.pdf   temporary invoice PDFs for Telegram (kept 1 hour)
  GET  /admin                    the admin page (asks for the password)
  *    /admin/api/...            needs  Authorization: Bearer <ADMIN_PASSWORD>
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request, Response

from . import khqr, logic
from .config import Config
from .store import IMAGE_EXT, INVOICE_TTL_SECONDS, Store

STATIC = Path(__file__).parent / "static"
MAX_IMAGE_BYTES = 2_000_000
MAX_INVOICE_BYTES = 1_500_000
MAX_ORDER_BYTES = 20_000
SECURITY = {"x-content-type-options": "nosniff", "referrer-policy": "no-referrer"}
PUBLIC_CORS = {"access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "content-type"}
ADMIN_CSP = (
    # telegram.org: the Mini App SDK (fullscreen, back button). frame-ancestors: Telegram Web shows Mini Apps in a frame.
    "default-src 'none'; script-src 'self' https://telegram.org; style-src 'unsafe-inline'; img-src 'self' blob: data: https:; "
    "connect-src 'self' https://fakestoreapi.com; frame-ancestors https://web.telegram.org https://*.telegram.org; base-uri 'none'; form-action 'none'"
)


class RateLimiter:
    """At most `limit` hits per `period` seconds for each key (in memory, per process)."""

    def __init__(self, limit: int, period: float = 60):
        self.limit, self.period = limit, period
        self.hits: dict[str, deque] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > self.period:
            q.popleft()
        if not q:
            self.hits.pop(key, None)
            q = self.hits[key]
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


def magic_ok(ctype: str, b: bytes) -> bool:
    """Does the file start like the image type it claims to be?"""
    if ctype == "image/jpeg":
        return b[:3] == b"\xff\xd8\xff"
    if ctype == "image/png":
        return b[:4] == b"\x89PNG"
    if ctype == "image/gif":
        return b[:4] == b"GIF8"
    if ctype == "image/webp":
        return b[:4] == b"RIFF" and b[8:12] == b"WEBP"
    return False


def secret_equal(a: str, b: str) -> bool:
    if not a or not b:
        return False
    return hmac.compare_digest(hashlib.sha256(a.encode()).digest(), hashlib.sha256(b.encode()).digest())


def order_view(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"], "createdAt": r["created_at"], "status": r["status"],
        "customer": {"name": r["customer_name"], "phone": r["phone"]}, "address": r["address"],
        "location": None if r["lat"] is None or r["lng"] is None else {"lat": r["lat"], "lng": r["lng"]},
        "note": r["note"], "shippingId": r["ship_id"], "payMethod": r["pay_method"],
        "subtotal": r["subtotal"], "shipping": r["shipping"], "total": r["total"], "paid": r["paid"],
        "deposit": logic.deposit_of(r["total"]) if r["pay_method"] == "deposit" else 0,
        "items": json.loads(r["items"]),
    }


def create_app(config: Config | None = None) -> FastAPI:
    cfg = config or Config.from_env()
    store = Store(cfg.data_dir)
    admin_limit = RateLimiter(cfg.admin_rate)
    order_limit = RateLimiter(cfg.order_rate)
    invoice_limit = RateLimiter(cfg.invoice_rate)

    app = FastAPI(title="Mini Shop API", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.store = store
    app.state.config = cfg

    # ---- helpers ----------------------------------------------------------------------------
    def reply(status: int, body: Any, headers: dict | None = None) -> Response:
        return Response(
            json.dumps(body, separators=(",", ":")), status_code=status,
            headers={"content-type": "application/json", "cache-control": "no-store", **SECURITY, **(headers or {})},
        )

    def client_ip(request: Request) -> str:
        if cfg.trust_proxy:
            fwd = request.headers.get("x-forwarded-for", "")
            if fwd:
                return fwd.split(",")[-1].strip()  # the address the nearest proxy saw
        return request.client.host if request.client else "unknown"

    def origin_of(request: Request) -> str:
        """This server's own address, for picture links."""
        return cfg.public_url or str(request.base_url).rstrip("/")

    def cors(origin: str, methods: str, headers: str) -> dict:
        if origin in cfg.allowed_origins:
            return {"access-control-allow-origin": origin, "access-control-allow-methods": methods, "access-control-allow-headers": headers, "vary": "Origin"}
        return {"vary": "Origin"}

    def orders_cors(origin: str) -> dict:
        return cors(origin, "GET, POST, OPTIONS", "content-type, x-order-token")

    async def read_body(request: Request, limit: int) -> bytes | None:
        """The request body, or None if it is bigger than `limit` bytes."""
        try:
            if int(request.headers.get("content-length") or 0) > limit:
                return None
        except ValueError:
            return None
        buf = bytearray()
        async for chunk in request.stream():
            buf += chunk
            if len(buf) > limit:
                return None
        return bytes(buf)

    async def read_json(request: Request, limit: int = 1_000_000) -> Any:
        body = await read_body(request, limit)
        try:
            return json.loads(body) if body else None
        except ValueError:
            return None

    def load_settings() -> dict:
        return logic.load_settings(store.get_json("settings", {}))

    def drop_unused_images(origin: str, before: list[str], after: list[str]) -> None:
        """Pictures we host are removed when no product uses them any more."""
        keep, prefix = set(after), f"{origin}/img/"
        for u in before:
            if u.startswith(prefix) and u not in keep:
                store.delete_image(u[len(prefix):])

    # ---- public: products and pictures ------------------------------------------------------
    @app.options("/products")
    @app.options("/img/{image_id}")
    async def public_options() -> Response:
        return Response(status_code=204, headers=PUBLIC_CORS)

    @app.get("/products")
    async def products() -> Response:
        return reply(200, [logic.public_shape(p) for p in store.load_products()], {**PUBLIC_CORS, "cache-control": "public, max-age=30"})

    @app.get("/img/{image_id}")
    async def image(image_id: str) -> Response:
        found = store.get_image(image_id)
        if not found:
            return reply(404, {"error": "not_found"}, PUBLIC_CORS)
        data, ctype = found
        return Response(data, headers={"content-type": ctype, "cache-control": "public, max-age=31536000, immutable", **PUBLIC_CORS, **SECURITY})

    # ---- public: orders ---------------------------------------------------------------------
    @app.options("/orders")
    @app.options("/orders/quote")
    @app.options("/orders/{order_id}")
    async def orders_options(request: Request) -> Response:
        return Response(status_code=204, headers=orders_cors(request.headers.get("origin", "")))

    @app.post("/orders")
    async def place_order(request: Request) -> Response:
        origin = request.headers.get("origin", "")
        h = orders_cors(origin)
        if origin not in cfg.allowed_origins:
            return reply(403, {"error": "origin_not_allowed"}, h)
        if not order_limit.allow(client_ip(request)):
            return reply(429, {"error": "too_many_requests"}, h)
        body = await read_body(request, MAX_ORDER_BYTES)
        if body is None:
            return reply(413, {"error": "too_large"}, h)
        try:
            data = json.loads(body)
        except ValueError:
            data = None
        settings = load_settings()
        error, order = logic.build_order(data, store.load_products(), settings)
        if error or order is None:
            return reply(400, {"error": error}, h)

        token = secrets.token_hex(16)
        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        for _ in range(6):
            order_id = f"MS{100000 + secrets.randbelow(900000)}"
            try:
                store.execute(
                    "INSERT INTO orders (id, token, created_at, status, customer_name, phone, address, lat, lng, note, ship_id, pay_method, subtotal, shipping, total, items, paid) "
                    "VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                    (order_id, token, created_at, order["name"], order["phone"], order["address"], order["lat"], order["lng"], order["note"],
                     order["shipId"], order["payMethod"], order["subtotal"], order["shipping"], order["total"], json.dumps(order["items"], separators=(",", ":"))),
                )
            except sqlite3.IntegrityError:
                continue  # that order number is taken, try another
            except sqlite3.Error:
                return reply(500, {"error": "could_not_save"}, h)
            out = {
                "id": order_id, "token": token, "createdAt": created_at, "status": "pending", "items": order["items"],
                "subtotal": order["subtotal"], "shipping": order["shipping"], "total": order["total"], "deposit": order["deposit"], "paid": 0,
            }
            if order["payMethod"] in ("khqr", "deposit"):
                due = order["deposit"] if order["payMethod"] == "deposit" else order["total"]
                if cfg.khqr_id and cfg.khqr_name and due > 0:
                    # a code made for this order: exact amount, expires, so the customer cannot mistype the price
                    out["qrImage"] = khqr.png_data_uri(khqr.build_payload(
                        bakong_id=cfg.khqr_id, account_no=cfg.khqr_account, bank_name=cfg.khqr_bank, merchant_name=cfg.khqr_name,
                        city=cfg.khqr_city, amount=due, bill_number=order_id, expires_in_minutes=cfg.khqr_minutes))
                elif settings["qrImage"]:
                    out["qrImage"] = settings["qrImage"]  # not configured: the shop's own fixed QR picture
            return reply(200, out, h)
        return reply(500, {"error": "could_not_save"}, h)

    @app.post("/orders/quote")
    async def quote(request: Request) -> Response:
        """May this place pay cash? (The shop's own location stays private.)"""
        origin = request.headers.get("origin", "")
        h = orders_cors(origin)
        if origin not in cfg.allowed_origins:
            return reply(403, {"error": "origin_not_allowed"}, h)
        if not admin_limit.allow(f"quote:{client_ip(request)}"):
            return reply(429, {"error": "too_many_requests"}, h)
        body = await read_json(request, MAX_ORDER_BYTES)
        loc = body.get("location") if isinstance(body, dict) and isinstance(body.get("location"), dict) else {}
        lat, lng = logic.num(loc.get("lat")), logic.num(loc.get("lng"))
        settings = load_settings()
        if lat is None or lng is None or abs(lat) > 90 or abs(lng) > 180:
            return reply(200, {"cashAllowed": False, "radiusKm": settings["radiusKm"], "distanceKm": None, "fees": logic.shipping_fees(None, settings)}, h)
        km = logic.distance_km(settings["shop"], {"lat": lat, "lng": lng})
        return reply(200, {"cashAllowed": km <= settings["radiusKm"], "radiusKm": settings["radiusKm"], "distanceKm": logic.tidy(logic.rnd(km, 1)), "fees": logic.shipping_fees(km, settings)}, h)

    @app.get("/orders/{order_id}")
    async def order_status(order_id: str, request: Request) -> Response:
        h = orders_cors(request.headers.get("origin", ""))
        row = store.one("SELECT id, token, status, created_at, total, paid, pay_method FROM orders WHERE id = ?", (order_id,)) if re.fullmatch(r"MS\d{6}", order_id) else None
        # the same answer whether the order is missing or the token is wrong
        if not row or not secret_equal(request.headers.get("x-order-token", ""), row["token"]):
            return reply(404, {"error": "not_found"}, h)
        return reply(200, {
            "id": row["id"], "status": row["status"], "createdAt": row["created_at"], "total": row["total"], "paid": row["paid"],
            "deposit": logic.deposit_of(row["total"]) if row["pay_method"] == "deposit" else 0,
        }, h)

    # ---- public: temporary invoice PDFs (was the invoice Worker) -----------------------------
    def invoice_cors(origin: str) -> dict:
        return cors(origin, "GET, POST, OPTIONS", "content-type")

    @app.options("/invoice")
    @app.options("/invoice/{name}")
    async def invoice_options(request: Request) -> Response:
        return Response(status_code=204, headers=invoice_cors(request.headers.get("origin", "")))

    @app.post("/invoice")
    async def invoice_upload(request: Request) -> Response:
        origin = request.headers.get("origin", "")
        h = invoice_cors(origin)
        if origin not in cfg.allowed_origins:
            return reply(403, {"error": "origin_not_allowed"}, h)
        if not invoice_limit.allow(client_ip(request)):
            return reply(429, {"error": "too_many_requests"}, h)
        body = await read_body(request, MAX_INVOICE_BYTES)
        if body is None:
            return reply(413, {"error": "too_large"}, h)
        if body[:5] == b"%PDF-":
            ext = "pdf"
        elif body[:4] == b"\x89PNG":
            ext = "png"
        else:
            return reply(400, {"error": "not_a_pdf_or_png"}, h)
        name = f"{secrets.token_hex(16)}.{ext}"
        store.put_invoice(name, body)
        return reply(200, {"url": f"{origin_of(request)}/invoice/{name}", "expiresIn": INVOICE_TTL_SECONDS}, h)

    @app.get("/invoice/{name}")
    async def invoice_download(name: str, request: Request) -> Response:
        h = invoice_cors(request.headers.get("origin", ""))
        m = re.fullmatch(r"([a-f0-9]{32})\.(pdf|png)", name)
        data = store.get_invoice(name) if m else None
        if not m or data is None:
            return reply(404, {"error": "not_found_or_expired"}, h)
        ctype = "application/pdf" if m.group(2) == "pdf" else "image/png"
        return Response(data, headers={
            "content-type": ctype, "content-disposition": f'attachment; filename="invoice.{m.group(2)}"',
            "cache-control": "private, no-store", "x-content-type-options": "nosniff", **h,
        })

    # ---- admin page -------------------------------------------------------------------------
    @app.get("/admin")
    @app.get("/admin/")
    async def admin_page() -> Response:
        return Response((STATIC / "admin.html").read_bytes(), headers={
            "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": ADMIN_CSP, **SECURITY,
        })

    @app.get("/admin/app.js")
    async def admin_js() -> Response:
        return Response((STATIC / "admin.js").read_bytes(), headers={"content-type": "application/javascript; charset=utf-8", "cache-control": "no-store", **SECURITY})

    # ---- admin API (Authorization: Bearer <ADMIN_PASSWORD>) ----------------------------------
    @app.api_route("/admin/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    async def admin_api(path: str, request: Request) -> Response:
        auth = request.headers.get("authorization", "")
        given = auth[7:] if auth.startswith("Bearer ") else ""
        if not admin_limit.allow(client_ip(request)):
            return reply(429, {"error": "too_many_requests"})
        if not secret_equal(given, cfg.admin_password):
            return reply(401, {"error": "unauthorized"})
        path = "/" + path
        method = request.method
        origin = origin_of(request)

        # orders
        if method == "GET" and path == "/orders":
            status = request.query_params.get("status")
            if status in logic.STATUSES:
                rows = store.query("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200", (status,))
            else:
                rows = store.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200")
            return reply(200, [order_view(r) for r in rows])
        m = re.fullmatch(r"/orders/(MS\d{6})", path)
        if m and method == "PATCH":
            body = await read_json(request)
            body = body if isinstance(body, dict) else {}
            row = store.one("SELECT * FROM orders WHERE id = ?", (m.group(1),))
            if not row:
                return reply(404, {"error": "not_found"})
            has_status, has_paid = "status" in body, "paid" in body
            if not has_status and not has_paid:
                return reply(400, {"error": "nothing_to_change"})
            if has_status and body["status"] not in logic.STATUSES:
                return reply(400, {"error": "bad_status"})
            paid = logic.num(body["paid"]) if has_paid else row["paid"]
            if paid is None or paid < 0 or paid > row["total"]:
                return reply(400, {"error": "bad_paid"})  # money received can be 0 up to the total
            store.execute("UPDATE orders SET status = ?, paid = ? WHERE id = ?", (body["status"] if has_status else row["status"], logic.money(paid), m.group(1)))
            return reply(200, order_view(store.one("SELECT * FROM orders WHERE id = ?", (m.group(1),))))

        # settings
        if path == "/settings":
            if method == "GET":
                return reply(200, load_settings())
            if method == "PUT":
                error, settings = logic.clean_settings(await read_json(request), origin)
                if error or settings is None:
                    return reply(400, {"error": error})
                with store.lock:
                    before = load_settings()
                    store.put_json("settings", settings)
                if before["qrImage"] and before["qrImage"] != settings["qrImage"]:
                    drop_unused_images(origin, [before["qrImage"]], [])
                return reply(200, settings)

        # pictures
        if method == "POST" and path == "/images":
            ctype = request.headers.get("content-type", "").split(";")[0].strip().lower()
            if ctype not in IMAGE_EXT:
                return reply(415, {"error": "unsupported_type"})
            body = await read_body(request, MAX_IMAGE_BYTES)
            if not body:
                return reply(413, {"error": "too_large"})
            if not magic_ok(ctype, body[:12]):
                return reply(415, {"error": "not_an_image"})
            return reply(200, {"url": f"{origin}/img/{store.put_image(ctype, body)}"})

        # products
        if method == "GET" and path == "/products":
            return reply(200, store.load_products())
        if method == "POST" and path == "/products":
            error, product = logic.clean_product(await read_json(request), origin)
            if error or product is None:
                return reply(400, {"error": error})
            with store.lock:  # nothing below awaits, so two admins cannot overwrite each other
                current = store.load_products()
                if len(current) >= logic.MAX_PRODUCTS:
                    return reply(400, {"error": "too_many_products"})
                created = {"id": max((p["id"] for p in current), default=0) + 1, **product}
                store.save_products([*current, created])
            return reply(200, created)
        m = re.fullmatch(r"/products/(\d+)", path)
        if m and method in ("PUT", "DELETE"):
            pid = int(m.group(1))
            data = await read_json(request) if method == "PUT" else None  # read before locking: no awaits while the lock is held
            with store.lock:
                current = store.load_products()
                old = next((p for p in current if p["id"] == pid), None)
                if old is None:
                    return reply(404, {"error": "not_found"})
                if method == "PUT":
                    error, product = logic.clean_product(data, origin)
                    if error or product is None:
                        return reply(400, {"error": error})
                    updated = {"id": pid, **product}
                    store.save_products([updated if p["id"] == pid else p for p in current])
                    drop_unused_images(origin, old["images"], updated["images"])
                    return reply(200, updated)
                store.save_products([p for p in current if p["id"] != pid])
                drop_unused_images(origin, old["images"], [])
                return reply(200, {"ok": True})

        return reply(404, {"error": "not_found"})

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], include_in_schema=False)
    async def not_found(path: str, request: Request) -> Response:
        if request.method == "OPTIONS":
            return Response(status_code=204, headers=PUBLIC_CORS)
        return reply(404, {"error": "not_found"})

    return app
