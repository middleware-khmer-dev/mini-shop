import time

from .conftest import ADMIN, SHOP

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 20
NEAR = {"lat": 11.56, "lng": 104.93}  # ~0.5 km from the default shop
FAR = {"lat": 13.36, "lng": 103.86}  # Siem Reap


def order_body(product, **kw):
    body = {
        "items": [{"productId": product["id"], "qty": 2, "variant": "red"}], "shippingId": "standard", "payMethod": "khqr",
        "customer": {"name": "Sok", "phone": "012 345 678"}, "address": "Street 1", "location": NEAR,
    }
    body.update(kw)
    return body


def place(client, body):
    return client.post("/orders", json=body, headers={"Origin": SHOP})


# ---- products -------------------------------------------------------------------------------
def test_public_products_shape_and_cors(client, product):
    r = client.get("/products")
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "*"
    assert r.json() == [{"id": 1, "title": "Mug", "price": 10, "description": "d", "category": "home", "image": "", "images": [], "rating": {"rate": 0, "count": 0}}]


def test_admin_requires_password(client):
    assert client.get("/admin/api/products").status_code == 401
    assert client.get("/admin/api/products", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.get("/admin/api/products", headers=ADMIN).status_code == 200


def test_locked_when_no_password_configured(tmp_path):
    from fastapi.testclient import TestClient
    from app.config import Config
    from app.main import create_app

    c = TestClient(create_app(Config(data_dir=tmp_path)))
    assert c.get("/admin/api/products", headers={"Authorization": "Bearer "}).status_code == 401


def test_product_validation_update_delete(client, product):
    assert client.post("/admin/api/products", headers=ADMIN, json={"price": 1, "category": "x"}).json() == {"error": "title_required"}
    assert client.post("/admin/api/products", headers=ADMIN, json={"title": "a", "price": -1, "category": "x"}).json() == {"error": "bad_price"}
    assert client.post("/admin/api/products", headers=ADMIN, json={"title": "a", "price": 1}).json() == {"error": "category_required"}
    r = client.put("/admin/api/products/1", headers=ADMIN, json={"title": "Big mug", "price": 12.345, "category": "home", "rating": {"rate": 9, "count": 3.4}})
    assert r.json() == {"id": 1, "title": "Big mug", "price": 12.35, "category": "home", "description": "", "images": [], "rating": {"rate": 5, "count": 3}}
    assert client.put("/admin/api/products/99", headers=ADMIN, json={}).status_code == 404
    assert client.delete("/admin/api/products/1", headers=ADMIN).json() == {"ok": True}
    assert client.get("/products").json() == []


def test_ids_keep_growing(client, product):
    r = client.post("/admin/api/products", headers=ADMIN, json={"title": "b", "price": 1, "category": "c"})
    assert r.json()["id"] == 2


# ---- pictures -------------------------------------------------------------------------------
def test_image_upload_serve_and_cleanup(client, product):
    r = client.post("/admin/api/images", headers={**ADMIN, "Content-Type": "image/png"}, content=PNG)
    url = r.json()["url"]
    assert url.startswith("http://test/img/")
    got = client.get(url.replace("http://test", ""))
    assert got.status_code == 200 and got.content == PNG and got.headers["content-type"] == "image/png"
    client.put("/admin/api/products/1", headers=ADMIN, json={"title": "Mug", "price": 1, "category": "c", "images": [url, "http://insecure/x.png"]})
    assert client.get("/products").json()[0]["image"] == url  # http:// link dropped, own picture kept
    client.put("/admin/api/products/1", headers=ADMIN, json={"title": "Mug", "price": 1, "category": "c", "images": []})
    assert client.get(url.replace("http://test", "")).status_code == 404  # no longer used -> deleted


def test_image_upload_checks(client):
    h = {**ADMIN, "Content-Type": "image/png"}
    assert client.post("/admin/api/images", headers={**ADMIN, "Content-Type": "text/plain"}, content=b"x").status_code == 415
    assert client.post("/admin/api/images", headers=h, content=b"not a png at all").json() == {"error": "not_an_image"}
    assert client.post("/admin/api/images", headers=h, content=PNG + b"0" * 2_000_000).status_code == 413
    assert client.get("/img/" + "z" * 32).status_code == 404


# ---- orders ---------------------------------------------------------------------------------
def test_order_priced_by_server(client, product):
    r = place(client, order_body(product))
    assert r.status_code == 200
    o = r.json()
    assert o["subtotal"] == 20 and o["shipping"] == 1 and o["total"] == 21 and o["status"] == "pending" and o["deposit"] == 0
    assert o["id"].startswith("MS") and len(o["token"]) == 32
    assert r.headers["access-control-allow-origin"] == SHOP
    # express adds the surcharge
    assert place(client, order_body(product, shippingId="express")).json()["shipping"] == 3.5
    # far away: highest step
    assert place(client, order_body(product, location=FAR)).json()["shipping"] == 6
    # no pin: highest step too
    assert place(client, order_body(product, location=None)).json()["shipping"] == 6


def test_order_rejects_bad_input_and_foreign_origin(client, product):
    assert client.post("/orders", json=order_body(product), headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.post("/orders", json=order_body(product)).status_code == 403
    for patch, err in [
        ({"customer": {"name": "", "phone": "012345"}}, "name_required"),
        ({"customer": {"name": "a", "phone": "abc"}}, "bad_phone"),
        ({"address": " "}, "address_required"),
        ({"shippingId": "teleport"}, "bad_shipping"),
        ({"payMethod": "card"}, "bad_payment"),
        ({"items": []}, "bad_items"),
        ({"items": [{"productId": 99, "qty": 1}]}, "unknown_product"),
        ({"items": [{"productId": 1, "qty": 0}]}, "bad_quantity"),
        ({"items": [{"productId": 1, "qty": 1.5}]}, "bad_quantity"),
    ]:
        r = place(client, order_body(product, **patch))
        assert (r.status_code, r.json()) == (400, {"error": err}), patch
    assert place(client, "nonsense").json() == {"error": "bad_request"}


def test_cash_only_within_radius(client, product):
    assert place(client, order_body(product, payMethod="cod")).status_code == 200
    for method in ("cod", "deposit"):
        r = place(client, order_body(product, payMethod=method, location=FAR))
        assert r.json() == {"error": "cash_not_allowed"}
    assert place(client, order_body(product, payMethod="cod", location=None)).json() == {"error": "cash_not_allowed"}


def test_deposit_and_qr_image(client, product):
    client.put("/admin/api/settings", headers=ADMIN, json={"shop": {"lat": 11.5564, "lng": 104.9282}, "radiusKm": 10, "qrImage": "https://x.example/qr.png", "tiers": [{"upToKm": 5, "fee": 1}, {"upToKm": None, "fee": 2}], "expressExtra": 1})
    o = place(client, order_body(product, payMethod="deposit")).json()
    assert o["total"] == 21 and o["deposit"] == 10.5 and o["qrImage"] == "https://x.example/qr.png"
    assert "qrImage" not in place(client, order_body(product, payMethod="cod")).json()


def test_order_status_needs_token(client, product):
    o = place(client, order_body(product)).json()
    url = f"/orders/{o['id']}"
    assert client.get(url).status_code == 404
    assert client.get(url, headers={"X-Order-Token": "wrong"}).status_code == 404
    r = client.get(url, headers={"X-Order-Token": o["token"]})
    assert r.json() == {"id": o["id"], "status": "pending", "createdAt": o["createdAt"], "total": 21, "paid": 0, "deposit": 0}
    assert client.get("/orders/MS000000", headers={"X-Order-Token": o["token"]}).status_code == 404


def test_quote(client):
    h = {"Origin": SHOP}
    r = client.post("/orders/quote", json={"location": NEAR}, headers=h).json()
    assert r["cashAllowed"] is True and r["radiusKm"] == 10 and r["distanceKm"] < 1 and r["fees"] == {"standard": 1, "express": 3.5}
    r = client.post("/orders/quote", json={"location": FAR}, headers=h).json()
    assert r["cashAllowed"] is False and r["fees"]["standard"] == 6
    r = client.post("/orders/quote", json={"location": None}, headers=h).json()
    assert r == {"cashAllowed": False, "radiusKm": 10, "distanceKm": None, "fees": {"standard": 6, "express": 8.5}}
    assert client.post("/orders/quote", json={}).status_code == 403


def test_preflight(client):
    r = client.options("/orders", headers={"Origin": SHOP})
    assert r.status_code == 204 and r.headers["access-control-allow-origin"] == SHOP and "x-order-token" in r.headers["access-control-allow-headers"]
    assert "access-control-allow-origin" not in client.options("/orders", headers={"Origin": "https://evil.example"}).headers


def test_order_rate_limit(client, product):
    codes = [place(client, order_body(product)).status_code for _ in range(11)]
    assert codes[:10] == [200] * 10 and codes[10] == 429


# ---- admin orders / settings -----------------------------------------------------------------
def test_admin_orders_status_and_payment(client, product):
    o = place(client, order_body(product, payMethod="deposit")).json()
    listed = client.get("/admin/api/orders", headers=ADMIN).json()
    assert listed[0]["id"] == o["id"] and listed[0]["customer"] == {"name": "Sok", "phone": "012 345 678"} and listed[0]["deposit"] == 10.5
    assert listed[0]["items"][0]["name"] == "Mug" and listed[0]["location"] == NEAR
    url = f"/admin/api/orders/{o['id']}"
    r = client.patch(url, headers=ADMIN, json={"status": "confirmed", "paid": 10.5}).json()
    assert r["status"] == "confirmed" and r["paid"] == 10.5
    assert client.patch(url, headers=ADMIN, json={"paid": 22}).json() == {"error": "bad_paid"}
    assert client.patch(url, headers=ADMIN, json={"status": "lost"}).json() == {"error": "bad_status"}
    assert client.patch(url, headers=ADMIN, json={}).json() == {"error": "nothing_to_change"}
    assert client.patch("/admin/api/orders/MS123456", headers=ADMIN, json={"status": "shipped"}).status_code == 404
    assert client.get("/admin/api/orders?status=pending", headers=ADMIN).json() == []
    assert len(client.get("/admin/api/orders?status=confirmed", headers=ADMIN).json()) == 1
    # the customer sees the money received
    assert client.get(f"/orders/{o['id']}", headers={"X-Order-Token": o["token"]}).json()["paid"] == 10.5


def test_settings_defaults_and_validation(client):
    s = client.get("/admin/api/settings", headers=ADMIN).json()
    assert s["radiusKm"] == 10 and s["shop"] == {"lat": 11.5564, "lng": 104.9282} and s["tiers"][-1] == {"upToKm": None, "fee": 6}
    good = {"shop": {"lat": 1, "lng": 2}, "radiusKm": 3, "qrImage": "", "tiers": [{"upToKm": 2, "fee": 1}, {"upToKm": None, "fee": 5}], "expressExtra": 2}
    assert client.put("/admin/api/settings", headers=ADMIN, json=good).json() == good
    assert client.get("/admin/api/settings", headers=ADMIN).json() == good
    for patch, err in [
        ({"shop": {"lat": 99, "lng": 0}}, "bad_location"), ({"radiusKm": 0.1}, "bad_radius"), ({"qrImage": "http://x"}, "bad_qr"),
        ({"tiers": [{"upToKm": 5, "fee": 1}, {"upToKm": 3, "fee": 2}, {"fee": 3}]}, "bad_tiers"), ({"expressExtra": -1}, "bad_express"),
    ]:
        assert client.put("/admin/api/settings", headers=ADMIN, json={**good, **patch}).json() == {"error": err}


# ---- invoice host ----------------------------------------------------------------------------
def test_invoice_roundtrip(client):
    pdf = b"%PDF-1.4 hello"
    assert client.post("/invoice", content=pdf).status_code == 403
    assert client.post("/invoice", content=b"junk", headers={"Origin": SHOP}).json() == {"error": "not_a_pdf_or_png"}
    r = client.post("/invoice", content=pdf, headers={"Origin": SHOP}).json()
    assert r["expiresIn"] == 3600 and r["url"].startswith("http://test/invoice/") and r["url"].endswith(".pdf")
    got = client.get(r["url"].replace("http://test", ""))
    assert got.content == pdf and got.headers["content-type"] == "application/pdf" and "attachment" in got.headers["content-disposition"]
    assert client.get("/invoice/" + "a" * 32 + ".pdf").status_code == 404
    assert client.post("/invoice", content=b"%PDF-" + b"0" * 1_600_000, headers={"Origin": SHOP}).status_code == 413


def test_invoice_expires(client, tmp_path):
    import os

    url = client.post("/invoice", content=b"%PDF-x", headers={"Origin": SHOP}).json()["url"].replace("http://test", "")
    f = next((tmp_path / "invoices").iterdir())
    old = time.time() - 3700
    os.utime(f, (old, old))
    assert client.get(url).status_code == 404


# ---- admin page --------------------------------------------------------------------------------
def test_admin_page_and_script(client):
    r = client.get("/admin")
    assert r.status_code == 200 and "Mini Shop admin" in r.text and "script-src 'self' https://telegram.org" in r.headers["content-security-policy"] and "frame-ancestors https://web.telegram.org" in r.headers["content-security-policy"]
    assert client.get("/admin/").status_code == 200
    js = client.get("/admin/app.js")
    assert js.status_code == 200 and "javascript" in js.headers["content-type"] and "ms_admin" in js.text
    assert client.get("/nothing").json() == {"error": "not_found"}


def test_rate_limits_from_env(monkeypatch):
    from app.config import Config

    monkeypatch.setenv("ADMIN_RATE", "500")
    monkeypatch.setenv("ORDER_RATE", "oops")  # ignored: not a number
    cfg = Config.from_env()
    assert cfg.admin_rate == 500 and cfg.order_rate == 10 and cfg.invoice_rate == 20


# ---- dynamic KHQR -------------------------------------------------------------------------------
def test_khqr_crc_matches_a_real_code():
    from app.khqr import crc16
    real = "00020101021129410009khqr@aclb0114000106116846140206ACLEDA394600042CCY010140414000106116846130511855176888775204599953031165802KH5910Im Sovanny6010PHNOM PENH6304"
    assert crc16(real) == "9DB8"


def test_khqr_payload_fields():
    from app.khqr import build_payload, crc16
    p = build_payload(bakong_id="khqr@aclb", account_no="123", bank_name="ACLEDA", merchant_name="Shop", city="PHNOM PENH", amount=10.5, bill_number="MS123456", now_ms=1000)
    assert "0102" "12" in p and "540510.50" in p and "5303840" in p and "0108MS123456" in p
    assert p[-8:-4] == "6304" and p[-4:] == crc16(p[:-4])


def test_order_gets_a_dynamic_khqr_when_configured(tmp_path):
    from fastapi.testclient import TestClient
    from app.config import Config
    from app.main import create_app
    cfg = Config(admin_password="s3cret", data_dir=tmp_path, public_url="http://test", khqr_id="khqr@aclb", khqr_name="Shop")
    c = TestClient(create_app(cfg), base_url="http://test")
    prod = c.post("/admin/api/products", headers=ADMIN, json={"title": "Mug", "price": 10, "category": "home", "description": "d"}).json()
    c.put("/admin/api/settings", headers=ADMIN, json={"shop": {"lat": 11.5564, "lng": 104.9282}, "radiusKm": 10, "qrImage": "", "tiers": [{"upToKm": 5, "fee": 1}, {"upToKm": None, "fee": 2}], "expressExtra": 1})
    o = place(c, order_body(prod, payMethod="khqr")).json()
    assert o["qrImage"].startswith("data:image/png;base64,")
    assert "qrImage" not in place(c, order_body(prod, payMethod="cod")).json()
