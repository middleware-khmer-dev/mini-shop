"""Dynamic KHQR (Bakong) payment code: builds the EMV text for one order and turns it into a PNG picture."""

from __future__ import annotations

import time

import segno


def _tlv(tag: str, value: str) -> str:
    if len(value) > 99:
        raise ValueError(f"KHQR tag {tag} is too long")
    return f"{tag}{len(value):02d}{value}"


def crc16(text: str) -> str:
    """CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as EMV QR requires."""
    crc = 0xFFFF
    for byte in text.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def build_payload(*, bakong_id: str, account_no: str = "", bank_name: str = "", merchant_name: str, city: str,
                  amount: float, bill_number: str = "", currency: str = "USD", expires_in_minutes: int = 10,
                  now_ms: int | None = None) -> str:
    """The KHQR text for one payment of `amount` (USD with 2 decimals, or whole riel for KHR)."""
    if currency not in ("USD", "KHR"):
        raise ValueError("currency must be USD or KHR")
    if not amount > 0:
        raise ValueError("amount must be above 0")
    amount_text = f"{amount:.2f}" if currency == "USD" else str(round(amount))
    now = int(time.time() * 1000) if now_ms is None else now_ms
    account = _tlv("00", bakong_id) + (_tlv("01", account_no) if account_no else "") + (_tlv("02", bank_name) if bank_name else "")
    extra = _tlv("01", bill_number[:25]) if bill_number else ""
    body = (
        _tlv("00", "01") + _tlv("01", "12")  # 12 = dynamic (amount fixed, expires)
        + _tlv("29", account) + _tlv("52", "5999")
        + _tlv("53", "840" if currency == "USD" else "116") + _tlv("54", amount_text)
        + _tlv("58", "KH") + _tlv("59", merchant_name[:25]) + _tlv("60", city[:15])
        + (_tlv("62", extra) if extra else "")
        + _tlv("99", _tlv("00", str(now)) + _tlv("01", str(now + expires_in_minutes * 60_000)))
        + "6304"
    )
    return body + crc16(body)


def png_data_uri(payload: str) -> str:
    """The QR picture as a data: URI (works as an <Image> source on web and phones)."""
    return segno.make(payload, error="m").png_data_uri(scale=8, border=3)
