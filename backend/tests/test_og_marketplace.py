"""P3 — Tests for /api/og/marketplace/{id} and /api/og/marketplace/{id}/image.svg

Seeds items directly via pymongo (id is a custom 12-char string, NOT ObjectId).
Cleanup: deletes all marketplace_items whose `id` starts with 'ogt_'.
Also covers DNA OG regression + basic smoke on auth/palettes/marketplace list.
"""
from __future__ import annotations

import os
import re
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
# Localhost direct used to assert app-emitted Cache-Control because the
# Kubernetes/Cloudflare ingress mutates Cache-Control to no-store on the
# public URL (infrastructure behavior, not app behavior).
LOCAL_URL = "http://localhost:8001"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

_client = MongoClient(MONGO_URL)
_db = _client[DB_NAME]


def _new_id(suffix: str = "") -> str:
    return ("ogt_" + uuid.uuid4().hex)[:12] + (f"_{suffix}" if suffix else "")


def _seed_item(**overrides) -> str:
    item_id = overrides.pop("id", None) or _new_id()
    doc = {
        "id": item_id,
        "type": "molde",
        "title": "Molde Geode Aurora",
        "description": "Molde de silicone para resina, padrão geode.",
        "image_url": "/api/static/market/placeholder.png",
        "price_brl": 189.9,
        "currency": "BRL",
        "handle": "lindart",
        "tags": [],
    }
    doc.update(overrides)
    _db.marketplace_items.insert_one(doc)
    return item_id


@pytest.fixture(scope="module", autouse=True)
def _cleanup():
    yield
    _db.marketplace_items.delete_many({"id": {"$regex": "^ogt_"}})


# ─────────────────────────── /api/og/marketplace/{id} HTML ───────────────────


class TestMarketplaceOgHtml:
    def test_returns_200_html_for_existing_item(self):
        iid = _seed_item()
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}", timeout=20)
        assert r.status_code == 200
        assert "text/html" in r.headers.get("Content-Type", "").lower()
        # Cache-Control is mutated by the public ingress; assert against the
        # app directly via localhost.
        r_local = requests.get(f"{LOCAL_URL}/api/og/marketplace/{iid}", timeout=10)
        assert r_local.headers.get("Cache-Control", "") == "public, max-age=600, s-maxage=600"

    def test_html_contains_required_og_tags(self):
        iid = _seed_item()
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}", timeout=20)
        body = r.text
        assert 'property="og:type" content="product"' in body
        assert 'property="og:title"' in body
        assert "Molde Geode Aurora" in body
        assert "@lindart" in body
        assert "LindArt" in body
        assert 'property="og:description"' in body
        assert 'property="og:image:width" content="1200"' in body
        assert 'property="og:image:height" content="630"' in body
        assert 'name="twitter:card" content="summary_large_image"' in body
        # og:image must be absolute and point to the svg endpoint
        m = re.search(r'property="og:image" content="([^"]+)"', body)
        assert m, "og:image meta missing"
        og_image = m.group(1)
        assert og_image.startswith("http")
        assert og_image.endswith(f"/api/og/marketplace/{iid}/image.svg")
        # og:url absolute
        m2 = re.search(r'property="og:url" content="([^"]+)"', body)
        assert m2 and m2.group(1).startswith("http")
        # meta refresh -> /marketplace
        assert re.search(r'http-equiv="refresh"[^>]+url=/marketplace', body)

    def test_price_meta_present_when_price_positive(self):
        iid = _seed_item(price_brl=189.9, currency="BRL")
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}", timeout=20)
        body = r.text
        assert 'property="product:price:amount" content="189.90"' in body
        assert 'property="product:price:currency" content="BRL"' in body

    def test_price_meta_omitted_when_price_none(self):
        iid = _seed_item(price_brl=None)
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}", timeout=20)
        body = r.text
        assert "product:price:amount" not in body
        assert "product:price:currency" not in body

    def test_price_meta_omitted_when_price_zero(self):
        iid = _seed_item(price_brl=0)
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}", timeout=20)
        body = r.text
        assert "product:price:amount" not in body
        assert "product:price:currency" not in body

    def test_404_for_missing_item(self):
        r = requests.get(f"{BASE_URL}/api/og/marketplace/itemquenaoexiste", timeout=20)
        assert r.status_code == 404
        assert "text/html" in r.headers.get("Content-Type", "").lower()
        assert "Item não encontrado" in r.text
        assert re.search(r'http-equiv="refresh"[^>]+url=/marketplace', r.text)


# ─────────────────────────── /api/og/marketplace/{id}/image.svg ──────────────


class TestMarketplaceOgSvg:
    def test_svg_returns_200_with_correct_headers(self):
        iid = _seed_item()
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}/image.svg", timeout=20)
        assert r.status_code == 200
        ct = r.headers.get("Content-Type", "").lower()
        assert "image/svg+xml" in ct
        # Assert app-emitted Cache-Control via localhost (ingress strips it on
        # the public URL).
        r_local = requests.get(f"{LOCAL_URL}/api/og/marketplace/{iid}/image.svg", timeout=10)
        assert r_local.headers.get("Cache-Control", "") == "public, max-age=86400, s-maxage=86400"
        body = r.text
        assert "<svg" in body
        assert 'viewBox="0 0 1200 630"' in body
        assert body.count("<rect") >= 2  # background + at least one swatch

    def test_svg_extracts_hex_swatches_from_tags(self):
        iid = _seed_item(tags=["#aabbcc", "#112233", "foo"])
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}/image.svg", timeout=20)
        body = r.text.lower()
        assert "#aabbcc" in body
        assert "#112233" in body

    def test_svg_fallback_palette_molde(self):
        iid = _seed_item(type="molde", tags=[])
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}/image.svg", timeout=20)
        body = r.text.lower()
        # all three molde fallback colors must appear
        for c in ("#c4b9a6", "#8b7355", "#d4c5b0"):
            assert c in body, f"missing molde fallback color {c}"

    def test_svg_fallback_palette_curso(self):
        iid = _seed_item(type="curso", tags=[])
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}/image.svg", timeout=20)
        assert "#d4956a" in r.text.lower()

    def test_svg_fallback_palette_preset(self):
        iid = _seed_item(type="preset", tags=[])
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}/image.svg", timeout=20)
        assert "#7ba7bc" in r.text.lower()

    def test_svg_fallback_palette_default_for_unknown_type(self):
        iid = _seed_item(type="ferramenta", tags=[])  # known to label, but no palette entry
        r = requests.get(f"{BASE_URL}/api/og/marketplace/{iid}/image.svg", timeout=20)
        assert "#c9a84c" in r.text.lower()

    def test_svg_for_missing_item_returns_200_default_palette(self):
        r = requests.get(
            f"{BASE_URL}/api/og/marketplace/itemquenaoexiste/image.svg",
            timeout=20,
        )
        # intentional: crawlers should not break
        assert r.status_code == 200
        assert "image/svg+xml" in r.headers.get("Content-Type", "").lower()
        body = r.text.lower()
        assert "#c9a84c" in body  # default palette


# ─────────────────────────── DNA OG regression ───────────────────────────────


class TestDnaOgRegression:
    """Garante que P3 não quebrou os endpoints DNA pré-existentes."""

    @pytest.fixture(scope="class")
    def share_id(self):
        payload = {
            "name": "TEST_p3_dna",
            "payload": {
                "signature": "Aurora Boreal",
                "mood": ["sereno", "etéreo"],
                "dominant_colors": ["#aabbcc", "#112233", "#445566"],
            },
            "handle": "test_p3_dna",
        }
        r = requests.post(f"{BASE_URL}/api/dna/share", json=payload, timeout=15)
        if r.status_code != 200:
            pytest.skip(f"DNA share POST failed: {r.status_code} {r.text[:200]}")
        sid = r.json().get("id") or r.json().get("share_id")
        if not sid:
            pytest.skip(f"DNA share response missing id: {r.json()}")
        yield sid
        _db.dna_shares.delete_many({"id": sid})

    def test_dna_og_html(self, share_id):
        r = requests.get(f"{BASE_URL}/api/og/dna/{share_id}", timeout=20)
        assert r.status_code == 200
        assert "text/html" in r.headers.get("Content-Type", "").lower()
        assert 'property="og:title"' in r.text
        assert "Aurora Boreal" in r.text

    def test_dna_og_svg(self, share_id):
        r = requests.get(f"{BASE_URL}/api/og/dna/{share_id}/image.svg", timeout=20)
        assert r.status_code == 200
        assert "image/svg+xml" in r.headers.get("Content-Type", "").lower()
        assert 'viewBox="0 0 1200 630"' in r.text


# ─────────────────────────── General smoke ───────────────────────────────────


class TestGeneralSmoke:
    def test_api_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200

    def test_palettes_list(self):
        r = requests.get(f"{BASE_URL}/api/palettes", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_marketplace_list(self):
        r = requests.get(f"{BASE_URL}/api/marketplace", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_auth_login_endpoint_exists(self):
        # Just verify endpoint reachable; wrong creds should yield 400/401, not 5xx
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "wrong"},
            timeout=15,
        )
        assert r.status_code in (400, 401, 404, 422), f"unexpected status {r.status_code}: {r.text[:200]}"
