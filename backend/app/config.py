"""Settings read from environment variables (see backend/README.md)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _list(value: str) -> list[str]:
    return [v.strip().rstrip("/") for v in value.split(",") if v.strip()]


@dataclass
class Config:
    # the admin password (required to use /admin; empty = admin API locked)
    admin_password: str = ""
    # where SQLite, pictures and temporary invoices live
    data_dir: Path = Path("data")
    # origins allowed to place orders / upload invoices (the shop website)
    allowed_origins: list[str] = field(default_factory=lambda: ["https://middleware-khmer-dev.github.io"])
    # public address of this server, used in picture links; empty = taken from each request
    public_url: str = ""
    # behind a reverse proxy: take the client IP from X-Forwarded-For
    trust_proxy: bool = False
    # dynamic KHQR (optional): when khqr_id and khqr_name are set, QR orders get a code with the exact amount
    khqr_id: str = "khqr@aclb"          # Bakong account id, e.g. name@aclb
    khqr_account: str = "00010611684613"     # USD account; bank account number (some banks, e.g. ACLEDA, need it)
    khqr_bank: str = "ACLEDA"        # bank name shown inside the code, e.g. ACLEDA
    khqr_name: str = "Im Sovanny"        # shop name on the code (max 25 characters)
    khqr_city: str = "PHNOM PENH"
    khqr_minutes: int = 10     # how long a code stays valid
    # requests per minute per IP
    admin_rate: int = 60
    order_rate: int = 10
    invoice_rate: int = 20

    @classmethod
    def from_env(cls) -> "Config":
        env = os.environ
        cfg = cls()
        cfg.admin_password = env.get("ADMIN_PASSWORD", "")
        cfg.data_dir = Path(env.get("DATA_DIR", "data"))
        if env.get("ALLOWED_ORIGINS"):
            cfg.allowed_origins = _list(env["ALLOWED_ORIGINS"])
        cfg.public_url = env.get("PUBLIC_URL", "").rstrip("/")
        cfg.khqr_id = env.get("KHQR_ID", "").strip()
        cfg.khqr_account = env.get("KHQR_ACCOUNT", "").strip()
        cfg.khqr_bank = env.get("KHQR_BANK", "").strip()
        cfg.khqr_name = env.get("KHQR_NAME", "").strip()
        cfg.khqr_city = env.get("KHQR_CITY", cfg.khqr_city).strip()
        if env.get("KHQR_MINUTES", "").isdigit() and int(env["KHQR_MINUTES"]) > 0:
            cfg.khqr_minutes = int(env["KHQR_MINUTES"])
        cfg.trust_proxy = env.get("TRUST_PROXY", "") in ("1", "true", "yes")
        for attr, name in (("admin_rate", "ADMIN_RATE"), ("order_rate", "ORDER_RATE"), ("invoice_rate", "INVOICE_RATE")):
            if env.get(name, "").isdigit():
                setattr(cfg, attr, int(env[name]))
        return cfg
