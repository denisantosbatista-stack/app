"""Phase 1 refactor validation — og.py & svd_video.py routers.

Validates that routes extracted to /app/backend/routers/og.py and
/app/backend/routers/svd_video.py keep the original HTTP contract,
and that the remaining (non-moved) routes in server.py still work.
"""
import os
import re
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: try reading frontend/.env (testing helper, never used in prod)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.strip().split("=", 1)[1]
                    break
    except FileNotFoundError:
        pass

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

FAL_KEY_SET = bool(os.environ.get("FAL_KEY"))


# ============================================================
# OG router — /api/og/dna/{share_id} and image.svg
# ============================================================
class TestOGRouter:
    def test_og_dna_missing_returns_404_html_with_og_tags(self):
        r = requests.get(f"{API}/og/dna/nonexistent_xyz_999", timeout=15)
        assert r.status_code == 404, r.text[:300]
        assert "text/html" in r.headers.get("content-type", "")
        body = r.text
        assert "og:title" in body
        assert "og:description" in body
        # meta refresh para redirect humano
        assert "http-equiv=\"refresh\"" in body or "refresh" in body

    def test_og_dna_image_svg_missing_returns_200_default_palette(self):
        r = requests.get(f"{API}/og/dna/nonexistent_xyz_999/image.svg", timeout=15)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/svg+xml")
        # NOTE: backend (verified via localhost:8001) sets
        # 'public, max-age=86400, s-maxage=86400', but the public preview
        # ingress overrides it to 'no-store, no-cache, must-revalidate'.
        # Either is acceptable for refactor validation.
        cc = r.headers.get("cache-control", "")
        assert cc, "Cache-Control header must be present"
        assert "<svg" in r.text
        assert 'viewBox="0 0 1200 630"' in r.text

    def test_og_dna_end_to_end_with_real_share(self):
        """Cria um share via /api/dna/share (route remanescente em server.py)
        e valida que /api/og/dna/{id} retorna 200 com paleta correta."""
        payload = {
            "payload": {
                "signature": "Aurora Boreal Teste",
                "mood": ["onírico", "translúcido", "champagne"],
                "dominant_colors": ["#D4AF37", "#0F4C3A", "#F4F1EA", "#1A1A1A"],
            },
            "handle": "tester_refactor",
        }
        r = requests.post(f"{API}/dna/share", json=payload, timeout=20)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        share_id = data["id"]
        assert data["path"] == f"/dna/{share_id}"

        # Now hit the OG HTML
        r2 = requests.get(f"{API}/og/dna/{share_id}", timeout=15)
        assert r2.status_code == 200, r2.text[:300]
        assert "text/html" in r2.headers.get("content-type", "")
        # Cache-Control presente (valor pode ser sobrescrito pelo proxy do preview)
        assert r2.headers.get("cache-control"), "Cache-Control header must be present"
        body = r2.text
        # OG tags presentes
        assert "og:title" in body
        assert "og:image" in body
        # Signature aparece no body (escapada ou não)
        assert "Aurora Boreal Teste" in body
        # Pelo menos uma cor da paleta aparece
        assert "#D4AF37" in body or "D4AF37" in body
        # og:image absoluto aponta para image.svg
        assert f"/api/og/dna/{share_id}/image.svg" in body

        # Now hit the OG SVG image
        r3 = requests.get(f"{API}/og/dna/{share_id}/image.svg", timeout=15)
        assert r3.status_code == 200
        assert r3.headers.get("content-type", "").startswith("image/svg+xml")
        # Paleta correta usada no SVG
        assert "#D4AF37" in r3.text
        assert "@tester_refactor" in r3.text


# ============================================================
# SVD video router — /api/ai/generate-video & /api/ai/video-status
# ============================================================
class TestSVDVideoRouter:
    def test_generate_video_without_fal_key_returns_503(self):
        body = {"color_a": "#D4AF37", "color_b": "#0F4C3A", "duration": 4, "size": "1280x720"}
        r = requests.post(f"{API}/ai/generate-video", json=body, timeout=15)
        if FAL_KEY_SET:
            assert r.status_code == 200
            data = r.json()
            assert "job_id" in data
            assert data["status"] == "processing"
            assert "model" in data
        else:
            assert r.status_code == 503, r.text[:300]
            err = r.json().get("detail", "")
            assert "FAL_KEY" in err

    def test_video_status_unknown_job_returns_404(self):
        r = requests.get(f"{API}/ai/video-status/job_does_not_exist_abc123", timeout=15)
        assert r.status_code == 404
        data = r.json()
        assert "detail" in data

    def test_video_status_existing_job_returns_status(self):
        """Cria job (só se FAL_KEY presente — sem ela, generate retorna 503
        e não há job para checar). Caso contrário, pular."""
        if not FAL_KEY_SET:
            pytest.skip("FAL_KEY ausente — pula validação do job real")
        body = {"color_a": "#D4AF37", "color_b": "#0F4C3A", "duration": 4}
        r = requests.post(f"{API}/ai/generate-video", json=body, timeout=15)
        assert r.status_code == 200
        job_id = r.json()["job_id"]
        # Imediatamente faz polling
        r2 = requests.get(f"{API}/ai/video-status/{job_id}", timeout=15)
        assert r2.status_code == 200
        st = r2.json()["status"]
        assert st in ("processing", "completed", "error")


# ============================================================
# Onboarding welcome-video — sempre 200, idle/processing/completed/error
# ============================================================
class TestOnboardingWelcomeVideo:
    def test_welcome_video_status_always_200(self):
        r = requests.get(f"{API}/onboarding/welcome-video", timeout=15)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        # Contrato esperado
        assert "exists" in data
        assert "url" in data
        assert "status" in data
        assert "error" in data
        assert isinstance(data["exists"], bool)
        assert data["status"] in ("idle", "processing", "completed", "error")

    def test_generate_welcome_video_behavior(self):
        r = requests.post(f"{API}/onboarding/generate-welcome-video", timeout=15)
        if FAL_KEY_SET:
            assert r.status_code == 200
            data = r.json()
            # ou já existe, ou está processing
            assert "already_exists" in data or data.get("status") in ("processing",)
        else:
            # se vídeo já existe, retorna 200 com already_exists antes do check de FAL_KEY?
            # Atualmente o código checa FAL_KEY antes de checar arquivo → 503 quando ausente.
            assert r.status_code == 503, r.text[:300]
            err = r.json().get("detail", "")
            assert "FAL_KEY" in err


# ============================================================
# Regressão: rotas remanescentes em server.py continuam funcionando
# ============================================================
class TestRegressionRemainingRoutes:
    def test_root_api(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200

    def test_feed_posts(self):
        # Endpoint correto: GET /api/feed (não /api/feed/posts)
        r = requests.get(f"{API}/feed", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_marketplace_items(self):
        # Endpoint correto: GET /api/marketplace (não /api/marketplace/items)
        r = requests.get(f"{API}/marketplace", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_challenges_list(self):
        r = requests.get(f"{API}/challenges", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_auth_login_seeded_admin(self):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "admin@lindart.app", "password": "Lindart#2026"},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        # JWT contract: token no body + cookies httpOnly
        assert "access_token" in data or "token" in data

    def test_generate_caption_endpoint_exists(self):
        """POST /api/ai/generate-caption — verifica que rota ainda existe.
        Pode retornar 400 (payload inválido) ou 200; 404 indicaria regressão."""
        r = requests.post(f"{API}/ai/generate-caption", json={}, timeout=20)
        # Não deve ser 404 (rota removida acidentalmente)
        assert r.status_code != 404, f"endpoint removido inadvertidamente: {r.status_code}"
        # 200, 400, 422 ou 503 (sem chave LLM) são aceitáveis
        assert r.status_code in (200, 400, 422, 500, 503), f"status inesperado: {r.status_code} body={r.text[:200]}"
