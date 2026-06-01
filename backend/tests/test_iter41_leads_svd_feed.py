"""Iter 41 — Tests: leads notify-me, SVD video pipeline (expecting 402 fal.ai),
feed and marketplace public endpoints, authFetch behavior compatibility.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env value provided by env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

TEST_EMAIL = "qabot+iter41@lindartmail.io"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ===== Leads: notify-me =====
class TestLeadsNotifyMe:
    def test_create_lead_first_time(self, api):
        # Use unique email-interest combo so idempotency test is deterministic
        payload = {
            "name": "QA Bot",
            "email": TEST_EMAIL,
            "interest": "anel",
            "message": "teste e2e iter41",
        }
        r = api.post(f"{BASE_URL}/api/leads/notify-me", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # already_subscribed pode ser True ou False dependendo de execução anterior
        assert "already_subscribed" in data

    def test_duplicate_lead_returns_already_subscribed(self, api):
        payload = {
            "name": "QA Bot",
            "email": TEST_EMAIL,
            "interest": "anel",
            "message": "duplicate test",
        }
        # Garante criação primeiro
        api.post(f"{BASE_URL}/api/leads/notify-me", json=payload)
        # Segunda chamada deve retornar already_subscribed=True
        r = api.post(f"{BASE_URL}/api/leads/notify-me", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("already_subscribed") is True, f"esperado already_subscribed=True, got {data}"

    def test_invalid_email_returns_422(self, api):
        r = api.post(
            f"{BASE_URL}/api/leads/notify-me",
            json={"name": "QA", "email": "not-an-email", "interest": "anel"},
        )
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"

    def test_empty_name_returns_4xx(self, api):
        r = api.post(
            f"{BASE_URL}/api/leads/notify-me",
            json={"name": "", "email": "valid@example.com", "interest": "anel"},
        )
        # Pydantic min_length=1 → 422; backend também tem fallback 400 após strip
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.text}"


# ===== SVD Video: fal.ai expected 402 (saldo esgotado) =====
class TestSvdVideoPipeline:
    def test_generate_video_returns_job_id_processing(self, api):
        r = api.post(
            f"{BASE_URL}/api/ai/generate-video",
            json={"color_a": "#D4AF37", "color_b": "#0F4C3A", "duration": 4},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "job_id" in data
        assert data.get("status") == "processing"
        # Store for next test via class attr
        TestSvdVideoPipeline.job_id = data["job_id"]

    def test_video_status_resolves_to_402_balance(self, api):
        job_id = getattr(TestSvdVideoPipeline, "job_id", None)
        if not job_id:
            pytest.skip("job_id não criado no teste anterior")
        # Poll por até 60s
        final = None
        for _ in range(20):
            r = api.get(f"{BASE_URL}/api/ai/video-status/{job_id}")
            assert r.status_code == 200, f"status endpoint failed: {r.status_code} {r.text}"
            data = r.json()
            if data.get("status") in ("completed", "error"):
                final = data
                break
            time.sleep(3)
        assert final is not None, "job não terminou em 60s (ainda processing)"
        # Esperado: error 402 com mensagem PT-BR de saldo esgotado
        assert final.get("status") == "error", f"esperado status=error, got {final}"
        assert final.get("http_status") == 402, f"esperado http_status=402, got {final}"
        detail = final.get("detail", "")
        assert "Saldo da conta fal.ai esgotado" in detail, f"mensagem PT-BR ausente: {detail}"
        # Garante que NÃO vaze a mensagem bruta '403 Forbidden'
        assert "403 Forbidden" not in detail, f"mensagem bruta vazou: {detail}"


# ===== Feed & Marketplace (públicos) =====
class TestPublicFeedMarketplace:
    def test_feed_returns_list(self, api):
        r = api.get(f"{BASE_URL}/api/feed", params={"limit": 5})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        # Pode ser lista direta ou objeto com lista
        if isinstance(data, dict):
            # tenta chaves comuns
            items = data.get("items") or data.get("results") or data.get("feed") or data.get("pieces")
            assert items is not None and isinstance(items, list), f"sem lista no body: {data}"
        else:
            assert isinstance(data, list), f"esperado lista, got {type(data)}"

    def test_marketplace_returns_list(self, api):
        r = api.get(f"{BASE_URL}/api/marketplace", params={"limit": 5})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        if isinstance(data, dict):
            items = data.get("items") or data.get("results") or data.get("products")
            assert items is not None and isinstance(items, list), f"sem lista no body: {data}"
        else:
            assert isinstance(data, list), f"esperado lista, got {type(data)}"
