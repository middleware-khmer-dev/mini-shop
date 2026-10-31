"""Storage: SQLite for products, settings and orders; plain files for pictures and temporary invoices.

This replaces the Cloudflare KV (products, settings), D1 (orders), R2 (pictures) and the invoice KV.
"""

from __future__ import annotations

import json
import re
import secrets
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,            -- e.g. MS268420, shown to the customer
  token TEXT NOT NULL,            -- secret the customer's device keeps, needed to look the order up
  created_at TEXT NOT NULL,       -- ISO time
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | shipped | delivered | cancelled
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  note TEXT NOT NULL DEFAULT '',
  ship_id TEXT NOT NULL,
  pay_method TEXT NOT NULL,
  subtotal REAL NOT NULL,
  shipping REAL NOT NULL,
  total REAL NOT NULL,
  items TEXT NOT NULL,            -- JSON: [{productId, name, price, qty, variant}]
  paid REAL NOT NULL DEFAULT 0    -- money received so far (set by the admin); total - paid is still due
);
CREATE INDEX IF NOT EXISTS orders_created ON orders (created_at DESC);
"""

IMAGE_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
EXT_IMAGE = {v: k for k, v in IMAGE_EXT.items()}
INVOICE_TTL_SECONDS = 3600

_IMG_ID = re.compile(r"^[a-f0-9]{32}$")


class Store:
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.images_dir = self.data_dir / "images"
        self.invoices_dir = self.data_dir / "invoices"
        for d in (self.data_dir, self.images_dir, self.invoices_dir):
            d.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()  # one writer at a time, so two admins cannot overwrite each other
        self.db = sqlite3.connect(self.data_dir / "shop.db", check_same_thread=False, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript(SCHEMA)

    # ---- key/value (products, settings) -------------------------------------------------------
    def get_json(self, key: str, default: Any) -> Any:
        with self.lock:
            row = self.db.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
        if not row:
            return default
        try:
            return json.loads(row["value"])
        except ValueError:
            return default

    def put_json(self, key: str, value: Any) -> None:
        with self.lock:
            self.db.execute(
                "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, json.dumps(value, separators=(",", ":"))),
            )

    def load_products(self) -> list[dict]:
        data = self.get_json("products", [])
        return data if isinstance(data, list) else []

    def save_products(self, products: list[dict]) -> None:
        self.put_json("products", products)

    # ---- orders -------------------------------------------------------------------------------
    def query(self, sql: str, args: tuple = ()) -> list[sqlite3.Row]:
        with self.lock:
            return self.db.execute(sql, args).fetchall()

    def one(self, sql: str, args: tuple = ()) -> sqlite3.Row | None:
        with self.lock:
            return self.db.execute(sql, args).fetchone()

    def execute(self, sql: str, args: tuple = ()) -> None:
        with self.lock:
            self.db.execute(sql, args)

    # ---- pictures -----------------------------------------------------------------------------
    def put_image(self, content_type: str, data: bytes) -> str:
        image_id = secrets.token_hex(16)
        (self.images_dir / f"{image_id}.{IMAGE_EXT[content_type]}").write_bytes(data)
        return image_id

    def get_image(self, image_id: str) -> tuple[bytes, str] | None:
        if not _IMG_ID.match(image_id):
            return None
        for ext, ctype in EXT_IMAGE.items():
            path = self.images_dir / f"{image_id}.{ext}"
            if path.is_file():
                return path.read_bytes(), ctype
        return None

    def delete_image(self, image_id: str) -> None:
        if not _IMG_ID.match(image_id):
            return
        for ext in EXT_IMAGE:
            (self.images_dir / f"{image_id}.{ext}").unlink(missing_ok=True)

    # ---- temporary invoices (deleted one hour after upload) -------------------------------------
    def _purge_invoices(self) -> None:
        cutoff = time.time() - INVOICE_TTL_SECONDS
        for p in self.invoices_dir.iterdir():
            try:
                if p.stat().st_mtime < cutoff:
                    p.unlink(missing_ok=True)
            except OSError:
                pass

    def put_invoice(self, name: str, data: bytes) -> None:
        self._purge_invoices()
        (self.invoices_dir / name).write_bytes(data)

    def get_invoice(self, name: str) -> bytes | None:
        self._purge_invoices()
        path = self.invoices_dir / name
        return path.read_bytes() if path.is_file() else None
