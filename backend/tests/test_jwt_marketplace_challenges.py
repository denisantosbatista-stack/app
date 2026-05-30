"""
Backend tests for JWT-gated POST endpoints:
  - /api/marketplace (POST) — requires auth, sets handle/verified from user
  - /api/challenges/{id}/submissions (POST) — requires auth
  - GET endpoints remain public and expose 'verified' field

Credentials: teste@lindart.app / Teste#2026 (handle='teste')
"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")
TEST_EMAIL = "teste@lindart.app"
TEST_PASSWORD = "Teste#2026"

# 1x1 transparent PNG
PNG_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"no token in body: {data}"
    return tok


@pytest.fixture(scope="module")
def active_challenge_id():
    r = requests.get(f"{BASE_URL}/api/challenges?status=active&limit=10", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) > 0, "no active challenges in seed"
    return data[0]["id"]


# ---------- Marketplace ----------
class TestMarketplaceAuth:
    def test_get_marketplace_public_with_verified_field(self):
        r = requests.get(f"{BASE_URL}/api/marketplace?limit=5", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        if items:
            assert "verified" in items[0], f"first item missing verified field: {items[0].keys()}"

    def test_post_marketplace_without_token_401(self):
        payload = {
            "type": "molde",
            "title": "TEST_unauth_should_fail",
            "image_base64": PNG_B64,
        }
        r = requests.post(f"{BASE_URL}/api/marketplace", json=payload, timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code} {r.text}"

    def test_post_marketplace_with_token_succeeds_and_sets_handle_and_verified(self, token):
        payload = {
            "type": "molde",
            "title": "TEST_jwt_marketplace_item",
            "description": "auto-test",
            "image_base64": PNG_B64,
            "price_brl": 49.9,
            "link": "https://example.com",
            "tags": ["test", "jwt"],
        }
        r = requests.post(
            f"{BASE_URL}/api/marketplace",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        assert r.status_code in (200, 201), f"create failed: {r.status_code} {r.text}"
        item = r.json()
        assert item.get("handle") == "teste", f"handle should be 'teste' from token, got {item.get('handle')}"
        assert item.get("verified") is True, f"verified should be True for known user, got {item.get('verified')}"
        assert item.get("title") == payload["title"]
        assert "id" in item

        # cleanup — try delete (best effort)
        item_id = item["id"]
        try:
            requests.delete(
                f"{BASE_URL}/api/marketplace/{item_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
        except Exception:
            pass


# ---------- Challenges ----------
class TestChallengesAuth:
    def test_get_challenges_active_returns_list(self, active_challenge_id):
        r = requests.get(f"{BASE_URL}/api/challenges?status=active", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_challenge_detail_submissions_have_verified_field(self, active_challenge_id):
        r = requests.get(f"{BASE_URL}/api/challenges/{active_challenge_id}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        subs = body.get("submissions", [])
        if subs:
            assert "verified" in subs[0], f"submission missing verified field: {subs[0].keys()}"

    def test_post_submission_without_token_401(self, active_challenge_id):
        payload = {"caption": "x", "image_base64": PNG_B64, "palette_colors": []}
        r = requests.post(
            f"{BASE_URL}/api/challenges/{active_challenge_id}/submissions",
            json=payload,
            timeout=15,
        )
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code} {r.text}"

    def test_post_submission_with_token_succeeds(self, active_challenge_id, token):
        payload = {
            "caption": "TEST_jwt_submission",
            "image_base64": PNG_B64,
            "palette_colors": ["#1b3a4b", "#f4f1ea"],
        }
        r = requests.post(
            f"{BASE_URL}/api/challenges/{active_challenge_id}/submissions",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        assert r.status_code in (200, 201), f"submit failed: {r.status_code} {r.text}"
        sub = r.json()
        assert sub.get("handle") == "teste"
        assert sub.get("verified") is True
        assert sub.get("caption") == payload["caption"]
