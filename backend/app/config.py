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
        cfg.trust_proxy = env.get("TRUST_PROXY", "") in ("1", "true", "yes")
        return cfg
