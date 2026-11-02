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


def test_khqr_defaults_survive_from_env(monkeypatch):
    from app.config import Config

    for k in ("KHQR_ID", "KHQR_ACCOUNT", "KHQR_BANK", "KHQR_NAME"):
        monkeypatch.delenv(k, raising=False)
    cfg = Config.from_env()
    assert cfg.khqr_id == "khqr@aclb" and cfg.khqr_name == "Im Sovanny"  # not set on the server: the built-in defaults apply
    monkeypatch.setenv("KHQR_ID", "shop@abaa")
    assert Config.from_env().khqr_id == "shop@abaa"  # the server setting wins
    monkeypatch.setenv("KHQR_ID", "")
    assert Config.from_env().khqr_id == ""  # set to empty: dynamic KHQR off, fixed QR picture


def test_khqr_matches_acleda_static_layout():
    from app import khqr

    # the tags of the shop's own ACLEDA static QR: account id, bank tag 39, phone in tag 62
    text = khqr.build_payload(bakong_id="khqr@aclb", account_no="85517688877", bank_name="ACLEDA", merchant_name="Im Sovanny",
                              city="PHNOM PENH", amount=1.0, bill_number="MS1", mobile="0969014971", bank_tag=("2CCY", "4"), now_ms=1)
    assert "0009khqr@aclb011185517688877" in text and "391300042CCY0101" + "4" in text
    assert "0108MS1" not in text and "0103MS1" in text and "02100969014971" in text
    assert text[-4:] == khqr.crc16(text[:-4])


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


# ---- Telegram message to the owner ---------------------------------------------------------------
def test_order_sends_a_telegram_message_when_configured(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from app import notify
    from app.config import Config
    from app.main import create_app

    sent = []
    monkeypatch.setattr(notify, "send_async", lambda token, chat, text: sent.append((token, chat, text)))
    cfg = Config(admin_password="s3cret", data_dir=tmp_path, public_url="http://test", khqr_id="", telegram_bot_token="123:abc", telegram_chat_id="42")
    c = TestClient(create_app(cfg), base_url="http://test")
    p = c.post("/admin/api/products", headers=ADMIN, json={"title": "Mug", "price": 10, "category": "home", "description": "d"}).json()
    body = {**order_body(p), "payMethod": "khqr"}
    r = place(c, body)
    assert r.status_code == 200 and len(sent) == 1
    token, chat, text = sent[0]
    assert (token, chat) == ("123:abc", "42")
    assert r.json()["id"] in text and "KHQR" in text and "http://test/admin" in text


def test_no_telegram_message_when_not_configured(client, product, monkeypatch):
    from app import notify

    monkeypatch.setattr(notify, "send_async", lambda *a: (_ for _ in ()).throw(AssertionError("must not send")))
    assert place(client, order_body(product)).status_code == 200


def test_telegram_failure_never_breaks_the_helper(monkeypatch):
    from app import notify

    def boom(*a, **k):
        raise OSError("network down")

    monkeypatch.setattr(notify.urllib.request, "urlopen", boom)
    assert notify.send_telegram("123:abc", "42", "hi") is False


def test_telegram_settings_from_env(monkeypatch):
    from app.config import Config

    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", " 123:abc ")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "-100200")
    cfg = Config.from_env()
    assert cfg.telegram_bot_token == "123:abc" and cfg.telegram_chat_id == "-100200"


# ---- Bakong automatic payment check --------------------------------------------------------------
def _qr_app(tmp_path, **kw):
    from fastapi.testclient import TestClient

    from app.config import Config
    from app.main import create_app

    cfg = Config(admin_password="s3cret", data_dir=tmp_path, public_url="http://test", khqr_name="Shop", **kw)
    app = create_app(cfg)
    return cfg, app, TestClient(app, base_url="http://test")


def _qr_order(c, deposit=False):
    p = c.post("/admin/api/products", headers=ADMIN, json={"title": "Mug", "price": 10, "category": "home", "description": "d"}).json()
    r = place(c, order_body(p, payMethod="deposit" if deposit else "khqr"))
    assert r.status_code == 200
    return r.json()


def test_qr_order_remembers_the_md5_of_its_code(tmp_path):
    import hashlib

    cfg, app, c = _qr_app(tmp_path)
    order = _qr_order(c)
    row = app.state.store.one("SELECT qr_md5, qr_due, qr_expires FROM orders WHERE id = ?", (order["id"],))
    assert len(row["qr_md5"]) == 32 and row["qr_due"] == order["total"] and row["qr_expires"] > time.time() * 1000
    assert hashlib.md5(b"x").hexdigest() != row["qr_md5"]


def test_bakong_marks_a_paid_qr_order(tmp_path, monkeypatch):
    from app import bakong, notify

    sent = []
    monkeypatch.setattr(notify, "send_async", lambda token, chat, text: sent.append(text))
    cfg, app, c = _qr_app(tmp_path, bakong_token="tok", telegram_bot_token="1:a", telegram_chat_id="9")
    order = _qr_order(c)
    store = app.state.store
    asked = []

    def unpaid(api, token, md5, proxy=""):
        asked.append(md5)
        return "unpaid", None

    assert bakong.settle_pending(store, cfg, check=unpaid) == 0 and len(asked) == 1
    assert store.one("SELECT paid FROM orders WHERE id = ?", (order["id"],))["paid"] == 0
    paid = lambda api, token, md5, proxy="": ("paid", {"amount": order["total"], "currency": "USD"})
    assert bakong.settle_pending(store, cfg, check=paid) == 1
    assert store.one("SELECT paid FROM orders WHERE id = ?", (order["id"],))["paid"] == order["total"]
    assert any(order["id"] in t and "Bakong" in t for t in sent)
    assert bakong.settle_pending(store, cfg, check=paid) == 0  # already paid: not asked again
    assert c.get(f"/orders/{order['id']}", headers={"Origin": SHOP, "X-Order-Token": order["token"]}).json()["paid"] == order["total"]


def test_bakong_deposit_order_is_paid_with_the_deposit(tmp_path):
    from app import bakong

    cfg, app, c = _qr_app(tmp_path, bakong_token="tok")
    order = _qr_order(c, deposit=True)
    paid = lambda api, token, md5, proxy="": ("paid", {"amount": order["deposit"], "currency": "USD"})
    assert bakong.settle_pending(app.state.store, cfg, check=paid) == 1
    assert app.state.store.one("SELECT paid FROM orders WHERE id = ?", (order["id"],))["paid"] == order["deposit"] < order["total"]


def test_bakong_ignores_wrong_amount_expired_codes_and_errors(tmp_path):
    from app import bakong

    cfg, app, c = _qr_app(tmp_path, bakong_token="tok")
    order = _qr_order(c)
    store = app.state.store
    less = lambda api, token, md5, proxy="": ("paid", {"amount": 0.01, "currency": "USD"})
    riel = lambda api, token, md5, proxy="": ("paid", {"amount": order["total"], "currency": "KHR"})
    broken = lambda api, token, md5, proxy="": ("error", None)
    for check in (less, riel, broken):
        assert bakong.settle_pending(store, cfg, check=check) == 0
    later = int(time.time() * 1000) + 60 * 60_000  # an hour later: the code (and its grace time) is over
    always = lambda api, token, md5, proxy="": ("paid", {"amount": order["total"], "currency": "USD"})
    assert bakong.settle_pending(store, cfg, check=always, now_ms=later) == 0
    assert store.one("SELECT paid FROM orders WHERE id = ?", (order["id"],))["paid"] == 0


def test_bakong_answer_parsing(monkeypatch):
    import io
    import json as _json

    from app import bakong

    class Opener:
        def __init__(self, body):
            self.body = body

        def open(self, req, timeout=0):
            assert req.get_header("Authorization") == "Bearer tok" and _json.loads(req.data) == {"md5": "m"}
            return io.BytesIO(_json.dumps(self.body).encode())

    found = {"responseCode": 0, "data": {"amount": 1, "currency": "USD"}}
    monkeypatch.setattr(bakong.urllib.request, "build_opener", lambda *a: Opener(found))
    assert bakong.check_md5("https://x", "tok", "m") == ("paid", {"amount": 1, "currency": "USD"})
    monkeypatch.setattr(bakong.urllib.request, "build_opener", lambda *a: Opener({"responseCode": 1, "data": None}))
    assert bakong.check_md5("https://x", "tok", "m") == ("unpaid", None)
    monkeypatch.setattr(bakong.urllib.request, "build_opener", lambda *a: (_ for _ in ()).throw(OSError("down")))
    assert bakong.check_md5("https://x", "tok", "m") == ("error", None)


def test_old_database_gets_the_new_order_columns(tmp_path):
    import sqlite3

    from app.store import Store

    db = sqlite3.connect(tmp_path / "shop.db")
    db.execute("CREATE TABLE orders (id TEXT PRIMARY KEY, token TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', "
               "customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, lat REAL, lng REAL, note TEXT NOT NULL DEFAULT '', "
               "ship_id TEXT NOT NULL, pay_method TEXT NOT NULL, subtotal REAL NOT NULL, shipping REAL NOT NULL, total REAL NOT NULL, items TEXT NOT NULL, paid REAL NOT NULL DEFAULT 0)")
    db.commit()
    db.close()
    store = Store(tmp_path)
    assert {"qr_md5", "qr_due", "qr_expires"} <= {r["name"] for r in store.query("PRAGMA table_info(orders)")}
    Store(tmp_path)  # opening it again is fine


def test_bakong_settings_from_env(monkeypatch):
    from app.config import Config

    monkeypatch.setenv("BAKONG_TOKEN", " tok ")
    monkeypatch.setenv("BAKONG_PROXY", "http://p:3128")
    cfg = Config.from_env()
    assert cfg.bakong_token == "tok" and cfg.bakong_proxy == "http://p:3128" and cfg.bakong_api == "https://api-bakong.nbc.gov.kh"


# ---- a new QR for an order whose code expired ----------------------------------------------------
def _renew(c, order, token=None):
    return c.post(f"/orders/{order['id']}/qr", headers={"Origin": SHOP, "X-Order-Token": order["token"] if token is None else token})


def test_new_qr_for_the_same_order(tmp_path):
    cfg, app, c = _qr_app(tmp_path)
    order = _qr_order(c)
    assert order["qrExpiresAt"] > time.time() * 1000
    r = _renew(c, order)
    assert r.status_code == 200
    body = r.json()
    assert body["qrImage"].startswith("data:image/png;base64,") and body["qrImage"] != order["qrImage"] and body["qrExpiresAt"] >= order["qrExpiresAt"]
    row = app.state.store.one("SELECT qr_md5, qr_due FROM orders WHERE id = ?", (order["id"],))
    assert len(row["qr_md5"].split()) == 2 and row["qr_due"] == order["total"]  # the first code is still checked too
    assert app.state.store.one("SELECT COUNT(*) AS n FROM orders")["n"] == 1  # no second order


def test_new_qr_needs_the_order_token_and_an_unpaid_qr_order(tmp_path):
    cfg, app, c = _qr_app(tmp_path)
    order = _qr_order(c)
    assert _renew(c, order, token="wrong").status_code == 404
    assert c.post(f"/orders/{order['id']}/qr", headers={"X-Order-Token": order["token"]}).status_code == 403  # not from the shop website
    assert c.post("/orders/MS999999/qr", headers={"Origin": SHOP, "X-Order-Token": "x"}).status_code == 404
    app.state.store.execute("UPDATE orders SET paid = total WHERE id = ?", (order["id"],))
    assert _renew(c, order).json() == {"error": "already_paid"}
    p = c.post("/admin/api/products", headers=ADMIN, json={"title": "Mug", "price": 10, "category": "home", "description": "d"}).json()
    cod = place(c, order_body(p, payMethod="cod")).json()
    assert _renew(c, cod).json() == {"error": "no_qr"}
    assert c.options(f"/orders/{order['id']}/qr", headers={"Origin": SHOP}).status_code == 204


def test_bakong_checks_every_code_of_an_order(tmp_path):
    from app import bakong

    cfg, app, c = _qr_app(tmp_path, bakong_token="tok")
    order = _qr_order(c)
    first = app.state.store.one("SELECT qr_md5 FROM orders WHERE id = ?", (order["id"],))["qr_md5"]
    assert _renew(c, order).status_code == 200
    asked = []

    def only_first_paid(api, token, md5, proxy=""):
        asked.append(md5)
        return ("paid", {"amount": order["total"], "currency": "USD"}) if md5 == first else ("unpaid", None)

    assert bakong.settle_pending(app.state.store, cfg, check=only_first_paid) == 1  # paid with the code from before the renewal
    assert asked == [first]  # found with the first code, no need to ask about the second
