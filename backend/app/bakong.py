"""Automatic payment check with the Bakong Open API (National Bank of Cambodia).

Every dynamic KHQR we make has an MD5; Bakong can tell us whether a payment was made with that exact code.
A background thread asks for every unpaid QR order until its code has expired, and marks the order paid.
Needs BAKONG_TOKEN (see README). The real money always goes straight to the shop's bank account.
"""

from __future__ import annotations

import json
import logging
import threading
import time
import urllib.error
import urllib.request

from . import notify

log = logging.getLogger("mini-shop.bakong")

POLL_SECONDS = 10
GRACE_MS = 10 * 60_000  # the customer may pay in the last seconds and the bank is a little late


def check_md5(api: str, token: str, md5: str, proxy: str = "", timeout: float = 8) -> tuple[str, dict | None]:
    """Ask Bakong about one QR. Returns ("paid", data), ("unpaid", None) or ("error", None)."""
    req = urllib.request.Request(
        f"{api.rstrip('/')}/v1/check_transaction_by_md5",
        data=json.dumps({"md5": md5}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({"https": proxy, "http": proxy}) if proxy else urllib.request.ProxyHandler())
        with opener.open(req, timeout=timeout) as res:  # noqa: S310 (https host from the settings)
            body = json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        # 401 / 403: bad or expired token, or this server is not allowed to use the API
        log.warning("Bakong answered HTTP %s", exc.code)
        return "error", None
    except Exception as exc:  # network down, timeout, bad JSON
        log.warning("Bakong check failed: %s", type(exc).__name__)
        return "error", None
    if body.get("responseCode") == 0 and body.get("data"):
        return "paid", body["data"]
    return "unpaid", None  # "transaction could not be found": not paid yet


def settle_pending(store, cfg, check=check_md5, now_ms: int | None = None) -> int:
    """One round: check every unpaid QR order whose code is still valid; returns how many were marked paid."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    rows = store.query(
        "SELECT id, qr_md5, qr_due FROM orders WHERE qr_md5 != '' AND paid < qr_due AND status != 'cancelled' AND qr_expires > ?",
        (now - GRACE_MS,),
    )
    done = 0
    for row in rows:
        state, data = check(cfg.bakong_api, cfg.bakong_token, row["qr_md5"], cfg.bakong_proxy)
        if state != "paid":
            continue
        data = data or {}
        amount = data.get("amount")
        currency = data.get("currency")
        if (isinstance(amount, (int, float)) and amount + 0.005 < row["qr_due"]) or (currency and currency != "USD"):
            log.warning("Order %s: Bakong payment does not match (amount %s %s, expected %s USD)", row["id"], amount, currency, row["qr_due"])
            _tell(cfg, f"⚠️ {row['id']}: Bakong រកឃើញការបង់ប្រាក់ ប៉ុន្តែចំនួនឬរូបិយប័ណ្ណមិនត្រូវ ({amount} {currency}, ត្រូវការ {notify.money(row['qr_due'])})។ សូមពិនិត្យដោយដៃ។")
            continue
        store.execute("UPDATE orders SET paid = ? WHERE id = ? AND paid < ?", (round(row["qr_due"], 2), row["id"], row["qr_due"]))
        done += 1
        _tell(cfg, f"✅ បានទទួលការបង់ប្រាក់ {row['id']}: {notify.money(row['qr_due'])} (ផ្ទៀងផ្ទាត់ដោយ Bakong)")
    return done


def _tell(cfg, text: str) -> None:
    if cfg.telegram_bot_token and cfg.telegram_chat_id:
        notify.send_async(cfg.telegram_bot_token, cfg.telegram_chat_id, text)


def ping(cfg) -> str:
    """Is the token accepted and is the API reachable from this server? ('ok' or 'error')."""
    state, _ = check_md5(cfg.bakong_api, cfg.bakong_token, "0" * 32, cfg.bakong_proxy)
    return "ok" if state == "unpaid" else "error"


def start_poller(store, cfg) -> threading.Thread:
    """Run settle_pending every few seconds in a background thread (one server process only)."""
    def loop() -> None:
        while True:
            time.sleep(POLL_SECONDS)
            try:
                settle_pending(store, cfg)
            except Exception:  # never let the thread die
                log.exception("payment check round failed")

    thread = threading.Thread(target=loop, name="bakong-poller", daemon=True)
    thread.start()
    return thread
