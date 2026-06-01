"""Tests for Share Tracking E2E (analytics/share, og aliases piece/palette)
and Wait-List endpoints (POST /api/waitlist, GET /api/waitlist/count).

Mapped to iter 42 review request T1..T12 (backend).
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend/.env load
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

assert BASE_URL, "REACT_APP_BACKEND_URL is required"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─── Analytics / share ────────────────────────────────────────────────
class TestAnalyticsShare:
    def test_t1_share_full_body(self, api):
        r = api.post(f"{BASE_URL}/api/analytics/share",
                     json={"source": "feed", "id": "abc", "ref": "share"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True

    def test_t2_share_empty_body_422(self, api):
        r = api.post(f"{BASE_URL}/api/analytics/share", json={}, timeout=15)
        assert r.status_code == 422, r.text

    def test_t3_share_no_ref(self, api):
        r = api.post(f"{BASE_URL}/api/analytics/share",
                     json={"source": "marketplace", "id": "xyz"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ─── OG aliases piece/palette ────────────────────────────────────────
class TestOgAliases:
    def test_t4_piece_404(self, api):
        r = api.get(f"{BASE_URL}/api/og/piece/nonexistent-{uuid.uuid4().hex[:8]}",
                    timeout=15, allow_redirects=False)
        assert r.status_code == 404, r.text
        # Should still render OG metatags for crawlers
        assert "og:title" in r.text.lower() or "<title>" in r.text.lower()

    def test_t5_palette_404(self, api):
        r = api.get(f"{BASE_URL}/api/og/palette/nonexistent-{uuid.uuid4().hex[:8]}",
                    timeout=15, allow_redirects=False)
        assert r.status_code == 404, r.text
        assert "og:title" in r.text.lower() or "<title>" in r.text.lower()


# ─── Waitlist ────────────────────────────────────────────────────────
class TestWaitlist:
    @pytest.fixture(scope="class")
    def unique_email(self):
        return f"test-iter42-{uuid.uuid4().hex[:10]}@example.com"

    def test_t6_create(self, api, unique_email):
        r = api.post(f"{BASE_URL}/api/waitlist",
                     json={"email": unique_email, "categoria": "aneis", "nome": "Maria"},
                     timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["created"] is True
        assert data["categoria"] == "aneis"

    def test_t7_duplicate(self, api, unique_email):
        # second post → idempotent
        r = api.post(f"{BASE_URL}/api/waitlist",
                     json={"email": unique_email, "categoria": "aneis"},
                     timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["created"] is False

    def test_t8_invalid_categoria_normalizes(self, api):
        email = f"test-iter42-{uuid.uuid4().hex[:10]}@example.com"
        r = api.post(f"{BASE_URL}/api/waitlist",
                     json={"email": email, "categoria": "foobar"},
                     timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["categoria"] == "outros"

    def test_t9_invalid_email(self, api):
        r = api.post(f"{BASE_URL}/api/waitlist",
                     json={"email": "not-an-email", "categoria": "aneis"},
                     timeout=15)
        assert r.status_code == 422, r.text

    def test_t10_count_aneis(self, api):
        r = api.get(f"{BASE_URL}/api/waitlist/count?categoria=aneis", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["categoria"] == "aneis"
        assert isinstance(data["count"], int)
        assert data["count"] >= 1

    def test_t11_count_all(self, api):
        r = api.get(f"{BASE_URL}/api/waitlist/count?categoria=all", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["categoria"] == "all"
        assert isinstance(data["count"], int)
        assert data["count"] >= 1

    def test_t12_count_invalid_normalizes(self, api):
        r = api.get(f"{BASE_URL}/api/waitlist/count?categoria=xyz", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["categoria"] == "outros"
        assert isinstance(data["count"], int)
