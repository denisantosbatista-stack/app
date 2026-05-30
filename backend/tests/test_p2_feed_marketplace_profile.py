# Regression tests for P2 features: Feed, Marketplace, Public Profile
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Feed ----------
class TestFeed:
    def test_get_feed_returns_list(self, client):
        r = client.get(f"{BASE_URL}/api/feed?limit=20", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        if data:
            p = data[0]
            for key in ("id", "handle", "title", "image_url"):
                assert key in p, f"missing key {key} in post"

    def test_get_feed_with_tag_filter(self, client):
        r = client.get(f"{BASE_URL}/api/feed?limit=10&tag=geode", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Marketplace ----------
class TestMarketplace:
    def test_get_marketplace_returns_list(self, client):
        r = client.get(f"{BASE_URL}/api/marketplace?limit=20", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        if data:
            it = data[0]
            for key in ("id", "handle", "title", "image_url", "type"):
                assert key in it, f"missing key {key} in market item"

    def test_get_marketplace_type_filter(self, client):
        r = client.get(f"{BASE_URL}/api/marketplace?type=molde&limit=10", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Profile ----------
class TestProfile:
    def test_get_profile_unknown_handle(self, client):
        # Unknown handles - depending on backend, may return 404 OR an empty profile.
        r = client.get(f"{BASE_URL}/api/profile/handle-that-does-not-exist-xyz123", timeout=20)
        assert r.status_code in (200, 404), r.text
        if r.status_code == 200:
            j = r.json()
            assert "handle" in j
            assert "stats" in j
            stats = j["stats"]
            for key in ("posts", "dnas", "marketplace_items", "challenges", "total_likes"):
                assert key in stats, f"missing stats key {key}"
