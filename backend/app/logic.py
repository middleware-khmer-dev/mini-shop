"""Pure business rules: settings, delivery fees, distance, order pricing and input cleaning.

Ported one-to-one from the old Cloudflare Worker (orders.js / index.js) so the app sees the same API.
"""

from __future__ import annotations

import math
import re
from typing import Any

DEFAULT_TIERS = [
    {"upToKm": 3, "fee": 1},
    {"upToKm": 5, "fee": 1.5},
    {"upToKm": 10, "fee": 2.5},
    {"upToKm": 25, "fee": 4},
    {"upToKm": None, "fee": 6},
]
DEFAULT_SETTINGS = {
    "shop": {"lat": 11.5564, "lng": 104.9282},  # Phnom Penh until set
    "radiusKm": 10,
    "qrImage": "",
    "tiers": DEFAULT_TIERS,
    "expressExtra": 2.5,
}

SHIPPING_IDS = ["standard", "express"]  # the delivery fee comes from the settings (by distance)
PAYMENTS = ["cod", "khqr", "deposit"]  # cash on delivery (only near the shop), QR, or QR deposit now + cash later
DEPOSIT_PERCENT = 50  # keep in step with DEPOSIT_PERCENT in the app (native/src/data/shop.ts)
STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"]

MAX_PRODUCTS = 500
MAX_IMAGES_PER_PRODUCT = 12


# ---- small helpers ------------------------------------------------------------------------------
def num(v: Any) -> float | None:
    """Like JavaScript Number(v) but None instead of NaN/Infinity. Booleans and null are not numbers."""
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        x = float(v)
    elif isinstance(v, str):
        try:
            x = float(v.strip())
        except ValueError:
            return None
    else:
        return None
    return x if math.isfinite(x) else None


def is_num(v: Any) -> bool:
    """A real JSON number (not a string)."""
    return not isinstance(v, bool) and isinstance(v, (int, float)) and math.isfinite(v)


def rnd(x: float, digits: int) -> float:
    """Round half up (like JavaScript Math.round), not half to even."""
    m = 10**digits
    return math.floor(x * m + 0.5) / m


def money(x: float) -> float:
    return rnd(x, 2)


def tidy(x: float) -> int | float:
    """1.0 -> 1 so the JSON looks the same as before."""
    return int(x) if float(x).is_integer() else x


def text(v: Any, max_len: int) -> str:
    return v.strip()[:max_len] if isinstance(v, str) else ""


def deposit_of(total: float) -> float:
    return rnd(total * DEPOSIT_PERCENT, 0) / 100


# ---- settings -----------------------------------------------------------------------------------
def clean_tiers(t: Any) -> list[dict] | None:
    if not isinstance(t, list) or not 1 <= len(t) <= 10:
        return None
    out: list[dict] = []
    prev = 0.0
    for i, row in enumerate(t):
        row = row if isinstance(row, dict) else {}
        fee = num(row.get("fee"))
        if fee is None or fee < 0 or fee > 1000:
            return None
        if i == len(t) - 1:
            out.append({"upToKm": None, "fee": tidy(money(fee))})
        else:
            km = num(row.get("upToKm"))
            if km is None or km <= prev or km > 1000:  # must grow from row to row
                return None
            out.append({"upToKm": tidy(rnd(km, 1)), "fee": tidy(money(fee))})
            prev = km
    return out


def load_settings(raw: Any) -> dict:
    s = raw if isinstance(raw, dict) else {}
    shop = s.get("shop") if isinstance(s.get("shop"), dict) else {}
    radius = s.get("radiusKm")
    extra = s.get("expressExtra")
    return {
        "shop": {"lat": shop["lat"], "lng": shop["lng"]} if is_num(shop.get("lat")) and is_num(shop.get("lng")) else DEFAULT_SETTINGS["shop"],
        "radiusKm": radius if is_num(radius) and radius > 0 else DEFAULT_SETTINGS["radiusKm"],
        "qrImage": s["qrImage"] if isinstance(s.get("qrImage"), str) else "",
        "tiers": clean_tiers(s.get("tiers")) or DEFAULT_TIERS,
        "expressExtra": extra if is_num(extra) and extra >= 0 else DEFAULT_SETTINGS["expressExtra"],
    }


def clean_settings(data: Any, origin: str) -> tuple[str | None, dict | None]:
    """Check what the admin sends for the settings; returns (error, settings)."""
    data = data if isinstance(data, dict) else {}
    shop = data.get("shop") if isinstance(data.get("shop"), dict) else {}
    lat, lng, radius = num(shop.get("lat")), num(shop.get("lng")), num(data.get("radiusKm"))
    if lat is None or abs(lat) > 90 or lng is None or abs(lng) > 180:
        return "bad_location", None
    if radius is None or radius < 0.5 or radius > 1000:
        return "bad_radius", None
    qr = data["qrImage"].strip() if isinstance(data.get("qrImage"), str) else ""
    if qr and not (re.fullmatch(r"https://\S{1,480}", qr) or qr.startswith(f"{origin}/img/")):
        return "bad_qr", None
    tiers = clean_tiers(data.get("tiers"))
    if not tiers:
        return "bad_tiers", None
    extra = num(data.get("expressExtra"))
    if extra is None or extra < 0 or extra > 1000:
        return "bad_express", None
    return None, {
        "shop": {"lat": lat, "lng": lng},
        "radiusKm": tidy(rnd(radius, 1)),
        "qrImage": qr,
        "tiers": tiers,
        "expressExtra": tidy(money(extra)),
    }


def distance_km(a: dict, b: dict) -> float:
    """Straight-line distance in km between two points (haversine)."""
    rad = math.radians
    h = math.sin(rad(b["lat"] - a["lat"]) / 2) ** 2 + math.cos(rad(a["lat"])) * math.cos(rad(b["lat"])) * math.sin(rad(b["lng"] - a["lng"]) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def shipping_fees(km: float | None, settings: dict) -> dict:
    """Delivery fee for a distance (None = unknown, which pays the highest row), plus the express surcharge."""
    tiers = settings["tiers"]
    tier = tiers[-1]
    if km is not None:
        tier = next((t for t in tiers if t["upToKm"] is not None and km <= t["upToKm"]), tiers[-1])
    return {"standard": tier["fee"], "express": tidy(money(tier["fee"] + settings["expressExtra"]))}


# ---- products -----------------------------------------------------------------------------------
def is_https(u: Any) -> bool:
    return isinstance(u, str) and len(u) <= 500 and re.fullmatch(r"https://\S+", u) is not None


def is_picture(u: Any, origin: str) -> bool:
    """An https picture link, or one of this server's own pictures."""
    return is_https(u) or (isinstance(u, str) and len(u) <= 500 and u.startswith(f"{origin}/img/"))


def clean_product(data: Any, origin: str) -> tuple[str | None, dict | None]:
    """Check and clean what an admin sends; returns (error, product)."""
    data = data if isinstance(data, dict) else {}
    title = text(data.get("title"), 200)
    if not title:
        return "title_required", None
    price = num(data.get("price"))
    if price is None or price < 0 or price > 1_000_000:
        return "bad_price", None
    category = text(data.get("category"), 60)
    if not category:
        return "category_required", None
    description = text(data.get("description"), 5000)
    raw_images = data.get("images") if isinstance(data.get("images"), list) else []
    images = list(dict.fromkeys([u for u in raw_images if is_picture(u, origin)][:MAX_IMAGES_PER_PRODUCT]))
    rating_in = data.get("rating") if isinstance(data.get("rating"), dict) else {}
    rate, count = num(rating_in.get("rate")), num(rating_in.get("count"))
    rating = {
        "rate": tidy(min(5.0, max(0.0, rate))) if rate is not None else 0,
        "count": int(max(0, math.floor(count + 0.5))) if count is not None else 0,
    }
    return None, {"title": title, "price": tidy(money(price)), "category": category, "description": description, "images": images, "rating": rating}


def public_shape(p: dict) -> dict:
    """What the app receives (same field names as fakestoreapi.com, plus `images`)."""
    images = p.get("images") or []
    return {
        "id": p["id"],
        "title": p["title"],
        "price": p["price"],
        "description": p["description"],
        "category": p["category"],
        "image": images[0] if images else "",
        "images": images,
        "rating": p["rating"],
    }


# ---- orders -------------------------------------------------------------------------------------
def build_order(data: Any, products: list[dict], settings: dict) -> tuple[str | None, dict | None]:
    """Check what the app sent and price it from our own products. Returns (error, order)."""
    if not isinstance(data, dict):
        return "bad_request", None
    customer = data.get("customer") if isinstance(data.get("customer"), dict) else {}
    name = text(customer.get("name"), 100)
    phone = text(customer.get("phone"), 30)
    address = text(data.get("address"), 500)
    if not name:
        return "name_required", None
    if not re.fullmatch(r"[0-9+\-\s()]{5,30}", phone):
        return "bad_phone", None
    if not address:
        return "address_required", None
    if data.get("shippingId") not in SHIPPING_IDS:
        return "bad_shipping", None
    if data.get("payMethod") not in PAYMENTS:
        return "bad_payment", None
    raw_items = data.get("items")
    if not isinstance(raw_items, list) or not 1 <= len(raw_items) <= 50:
        return "bad_items", None

    by_id = {p["id"]: p for p in products}
    items = []
    for it in raw_items:
        it = it if isinstance(it, dict) else {}
        pid, qty = num(it.get("productId")), num(it.get("qty"))
        p = by_id.get(int(pid)) if pid is not None and float(pid).is_integer() else None
        if p is None:
            return "unknown_product", None
        if qty is None or not float(qty).is_integer() or not 1 <= qty <= 99:
            return "bad_quantity", None
        items.append({"productId": p["id"], "name": p["title"], "price": p["price"], "qty": int(qty), "variant": text(it.get("variant"), 20)})

    lat = lng = None
    loc = data.get("location")
    if isinstance(loc, dict) and num(loc.get("lat")) is not None and num(loc.get("lng")) is not None:
        lat, lng = num(loc["lat"]), num(loc["lng"])
        if abs(lat) > 90 or abs(lng) > 180:
            lat = lng = None
    km = None if lat is None else distance_km(settings["shop"], {"lat": lat, "lng": lng})
    # cash (also the rest of a deposit) is only for deliveries within the radius around the shop; farther (or unknown) places pay by QR
    if data["payMethod"] in ("cod", "deposit") and (km is None or km > settings["radiusKm"]):
        return "cash_not_allowed", None
    subtotal = money(sum(i["price"] * i["qty"] for i in items))
    shipping = shipping_fees(km, settings)[data["shippingId"]]
    total = money(subtotal + shipping)
    return None, {
        "name": name, "phone": phone, "address": address, "lat": lat, "lng": lng, "note": text(data.get("note"), 500),
        "shipId": data["shippingId"], "payMethod": data["payMethod"], "items": items,
        "subtotal": subtotal, "shipping": shipping, "total": total,
        "deposit": deposit_of(total) if data["payMethod"] == "deposit" else 0,
    }
