import pytest
from fastapi.testclient import TestClient

from app.config import Config
from app.main import create_app

SHOP = "https://middleware-khmer-dev.github.io"
ADMIN = {"Authorization": "Bearer s3cret"}


@pytest.fixture
def client(tmp_path):
    cfg = Config(admin_password="s3cret", data_dir=tmp_path, public_url="http://test")
    return TestClient(create_app(cfg), base_url="http://test")


@pytest.fixture
def product(client):
    r = client.post("/admin/api/products", headers=ADMIN, json={"title": "Mug", "price": 10, "category": "home", "description": "d"})
    assert r.status_code == 200
    return r.json()
