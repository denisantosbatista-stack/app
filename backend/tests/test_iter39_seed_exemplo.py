"""Iter 39 — Validate seed feed exemplo tag + marketplace non-regression."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestFeedSeed:
    def test_feed_returns_lindart_posts_with_exemplo_tag(self, client):
        r = client.get(f"{BASE_URL}/api/feed?limit=20", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        # Endpoint may return list or {posts: [...]}; normalize
        posts = body if isinstance(body, list) else (body.get("posts") or body.get("items") or [])
        assert isinstance(posts, list), f"unexpected body: {body}"
        lindart_posts = [p for p in posts if p.get("handle") == "lindart"]
        assert len(lindart_posts) >= 3, f"Expected ≥3 @lindart posts; got {len(lindart_posts)}. Body keys: {list(body) if isinstance(body, dict) else 'list'}"
        # Every @lindart post must carry the 'exemplo' tag
        missing = [p for p in lindart_posts if "exemplo" not in (p.get("tags") or [])]
        assert not missing, f"@lindart posts missing 'exemplo' tag: {[p.get('id') for p in missing]}"

    def test_feed_seed_idempotent_no_duplicates(self, client):
        r = client.get(f"{BASE_URL}/api/feed?limit=50", timeout=20)
        body = r.json()
        posts = body if isinstance(body, list) else (body.get("posts") or body.get("items") or [])
        lindart_titles = [p.get("title") for p in posts if p.get("handle") == "lindart"]
        # All three seed titles should appear exactly once
        seed_titles = [
            "Ouro Líquido em movimento",
            "Oceano Mineral — estudo em azul profundo",
            "Geode dourada — bandeja autoral",
        ]
        for t in seed_titles:
            assert lindart_titles.count(t) == 1, f"Title '{t}' appears {lindart_titles.count(t)} times (expected 1)"


class TestMarketplaceNonRegression:
    def test_marketplace_items_returns_seed(self, client):
        # Try common endpoints
        for path in ("/api/marketplace/items", "/api/marketplace"):
            r = client.get(f"{BASE_URL}{path}", timeout=20)
            if r.status_code == 200:
                body = r.json()
                items = body if isinstance(body, list) else (body.get("items") or body.get("posts") or [])
                assert isinstance(items, list)
                # Expect at least the 2 seed items
                lindart_items = [it for it in items if it.get("handle") == "lindart"]
                assert len(lindart_items) >= 2, f"Expected ≥2 @lindart marketplace items; got {len(lindart_items)}"
                return
        pytest.fail("Marketplace endpoint not found (tried /api/marketplace/items and /api/marketplace)")
