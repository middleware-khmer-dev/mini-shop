"""Telegram message to the shop owner when an order is placed (optional: needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)."""

from __future__ import annotations

import json
import logging
import threading
import urllib.request

log = logging.getLogger("mini-shop.notify")

PAY_LABEL = {"cod": "បង់សាច់ប្រាក់ពេលទទួល", "khqr": "KHQR (រង់ចាំការបង់ប្រាក់)", "deposit": "ប្រាក់កក់ 50% តាម KHQR (រង់ចាំការបង់ប្រាក់)"}


def money(value: float) -> str:
    return f"${value:,.2f}"


def order_message(order_id: str, order: dict, admin_url: str) -> str:
    """The text of the message; plain text, so nothing in a name or address can break it."""
    method = order["payMethod"]
    due = order["deposit"] if method == "deposit" else order["total"] if method == "khqr" else 0
    lines = [f"🛒 ការកម្ម៉ង់ថ្មី {order_id}", f"អតិថិជន: {order['name']} · {order['phone']}", f"វិធីបង់ប្រាក់: {PAY_LABEL.get(method, method)}"]
    if due:
        lines.append(f"សូមពិនិត្យ ACLEDA ថាបានទទួល {money(due)} (លេខកម្ម៉ង់ {order_id}) រួចកត់ត្រាក្នុង admin")
    lines.append(f"សរុប: {money(order['total'])} (ដឹកជញ្ជូន {money(order['shipping'])})")
    for item in order["items"][:10]:
        variant = f" ({item['variant']})" if item.get("variant") else ""
        lines.append(f"• {item['name']}{variant} × {item['qty']}")
    if len(order["items"]) > 10:
        lines.append(f"… និង {len(order['items']) - 10} ទៀត")
    lines.append(f"អាសយដ្ឋាន: {order['address']}")
    if order.get("note"):
        lines.append(f"កំណត់ចំណាំ: {order['note']}")
    lines.append(f"Admin: {admin_url}")
    return "\n".join(lines)[:4000]


def send_telegram(token: str, chat_id: str, text: str, timeout: float = 8) -> bool:
    """Send one message; returns False (and logs) instead of raising, an order must never fail because of Telegram."""
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=json.dumps({"chat_id": chat_id, "text": text, "disable_web_page_preview": True}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:  # noqa: S310 (fixed https host)
            return res.status == 200
    except Exception as exc:  # network down, bad token, blocked chat ...
        log.warning("Telegram notification failed: %s", type(exc).__name__)  # never log the URL: it holds the token
        return False


def send_async(token: str, chat_id: str, text: str) -> None:
    """Fire and forget, so the customer does not wait for Telegram."""
    threading.Thread(target=send_telegram, args=(token, chat_id, text), daemon=True).start()
