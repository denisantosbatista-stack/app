"""
P2 Backend Modularization Phase 2 - AI router extraction regression tests.

Validates:
- All /api/ai/* endpoints are reachable and return reasonable responses
- Non-AI routes (/api/, /api/palettes, /api/dna/share) still work
- No duplicate routes
- Other routers (feed, marketplace, profiles, challenges, auth, og, svd_video) still load
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

TIMEOUT_FAST = 15
TIMEOUT_AI = 90  # LLM calls can be slow


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ===== Smoke / non-AI =====
class TestSmoke:
    def test_root(self, s):
        r = s.get(f"{API}/", timeout=TIMEOUT_FAST)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "LindArt" in data["message"]

    def test_palettes_list(self, s):
        r = s.get(f"{API}/palettes", timeout=TIMEOUT_FAST)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_no_duplicate_routes(self):
        """Boots app in-process and asserts no path+method is registered twice."""
        import sys
        sys.path.insert(0, "/app/backend")
        from server import app
        counts = {}
        for route in app.routes:
            if hasattr(route, "methods") and hasattr(route, "path"):
                for m in route.methods:
                    counts[(m, route.path)] = counts.get((m, route.path), 0) + 1
        dups = {k: v for k, v in counts.items() if v > 1}
        assert not dups, f"Duplicate routes detected: {dups}"


# ===== /api/dna/share (non-AI in server.py) =====
class TestDnaShare:
    def test_create_and_get(self, s):
        payload = {
            "payload": {"colors": ["#111111", "#eeeeee"], "name": "TEST_p2_dna"},
            "handle": "TEST_handle",
        }
        r = s.post(f"{API}/dna/share", json=payload, timeout=TIMEOUT_FAST)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str)
        share_id = data["id"]

        g = s.get(f"{API}/dna/share/{share_id}", timeout=TIMEOUT_FAST)
        assert g.status_code == 200
        body = g.json()
        assert body["id"] == share_id
        assert body["payload"]["name"] == "TEST_p2_dna"
        assert "_id" not in body

    def test_invalid_payload(self, s):
        r = s.post(f"{API}/dna/share", json={"payload": None}, timeout=TIMEOUT_FAST)
        # Pydantic 422 OR custom 400
        assert r.status_code in (400, 422)

    def test_get_404(self, s):
        r = s.get(f"{API}/dna/share/doesnotexist123", timeout=TIMEOUT_FAST)
        assert r.status_code == 404


# ===== AI endpoints =====
class TestAIRoutes:
    def test_generate_palette(self, s):
        r = s.post(
            f"{API}/ai/generate-palette",
            json={"prompt": "uma joia de resina inspirada em oceano profundo, tons de azul marinho e dourado"},
            timeout=TIMEOUT_AI,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "colors" in data
        assert isinstance(data["colors"], list) and len(data["colors"]) >= 3
        for c in data["colors"]:
            assert "hex" in c and c["hex"].startswith("#")

    def test_generate_palette_missing_body(self, s):
        r = s.post(f"{API}/ai/generate-palette", json={}, timeout=TIMEOUT_FAST)
        # Should validate (422) or 400 for missing/empty prompt
        assert r.status_code in (400, 422)

    def test_generate_voice(self, s):
        r = s.post(
            f"{API}/ai/generate-voice",
            json={"text": "Olá, isto é um teste rápido.", "voice": "alloy"},
            timeout=TIMEOUT_AI,
        )
        # Accept 200 (audio bytes/base64) or known mapped errors
        assert r.status_code in (200, 400, 502), r.text
        if r.status_code == 200:
            # Response could be JSON {audio_base64:...} or audio/* stream
            ct = r.headers.get("content-type", "")
            assert "audio" in ct or "json" in ct or "octet-stream" in ct

    def test_transcribe_missing_audio(self, s):
        # No multipart audio -> validation error
        r = requests.post(f"{API}/ai/transcribe", timeout=TIMEOUT_FAST)
        assert r.status_code in (400, 422)

    def test_generate_image(self, s):
        r = s.post(
            f"{API}/ai/generate-image",
            json={"prompt": "anel de resina dourado sobre fundo neutro, foto produto"},
            timeout=TIMEOUT_AI,
        )
        assert r.status_code in (200, 502), r.text
        if r.status_code == 200:
            data = r.json()
            # Expect either image_base64 / url / images
            assert any(k in data for k in ("image_base64", "image", "url", "images"))

    def test_generate_caption(self, s):
        r = s.post(
            f"{API}/ai/generate-caption",
            json={
                "product_name": "Anel Oceano Mineral",
                "style": "luxo",
                "platform": "instagram",
            },
            timeout=TIMEOUT_AI,
        )
        assert r.status_code in (200, 400, 502), r.text
        if r.status_code == 200:
            data = r.json()
            assert "caption" in data or "text" in data

    def test_luxury_score_heuristic(self, s):
        # LuxuryScoreRequest.colors is List[str] (hex codes)
        r = s.post(
            f"{API}/ai/luxury-score",
            json={
                "palette_name": "TEST_p2",
                "colors": ["#0a0a0a", "#c9a96a", "#f5f3ef"],
            },
            timeout=TIMEOUT_AI,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "score" in data
        assert isinstance(data["score"], (int, float))
        assert 0 <= data["score"] <= 100
        assert "tier" in data

    def test_luxury_score_empty_colors(self, s):
        r = s.post(f"{API}/ai/luxury-score", json={"colors": []}, timeout=TIMEOUT_FAST)
        assert r.status_code == 400

    def test_visual_dna(self, s):
        r = s.post(
            f"{API}/ai/visual-dna",
            json={
                "palettes": [
                    {
                        "name": "p1",
                        "colors": [
                            {"hex": "#1b3a4b", "name": "a", "role": "principal"},
                            {"hex": "#f4f1ea", "name": "b", "role": "acento"},
                        ],
                    },
                    {
                        "name": "p2",
                        "colors": [
                            {"hex": "#0a0a0a", "name": "c", "role": "principal"},
                            {"hex": "#c9a96a", "name": "d", "role": "acento"},
                        ],
                    },
                ]
            },
            timeout=TIMEOUT_AI,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # DNA endpoint returns metrics + likely narrative
        assert isinstance(data, dict)
        assert len(data) > 0

    def test_mentora(self, s):
        # MentoraRequest: {message: str, history?: [...]}
        r = s.post(
            f"{API}/ai/mentora",
            json={"message": "Em 1 frase, o que é luxo?"},
            timeout=TIMEOUT_AI,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert any(k in data for k in ("reply", "message", "content", "text", "answer"))

    def test_mentora_missing_body(self, s):
        r = s.post(f"{API}/ai/mentora", json={}, timeout=TIMEOUT_FAST)
        assert r.status_code in (400, 422)

    def test_trends(self, s):
        r = s.post(
            f"{API}/ai/trends",
            json={"niche": "joias de resina", "horizon": "2026"},
            timeout=TIMEOUT_AI,
        )
        assert r.status_code in (200, 400, 502), r.text

    def test_collection(self, s):
        # CollectionRequest: {theme: str, pieces?: List[str]}
        r = s.post(
            f"{API}/ai/collection",
            json={"theme": "oceano mineral", "pieces": ["anel", "colar", "brinco"]},
            timeout=TIMEOUT_AI,
        )
        assert r.status_code in (200, 400, 502), r.text


# ===== Ensure other routers still mounted =====
class TestOtherRouters:
    def test_feed_route_exists(self, s):
        # Most feed endpoints require auth — we just want NOT 404
        r = s.get(f"{API}/feed", timeout=TIMEOUT_FAST)
        assert r.status_code != 404

    def test_marketplace_route_exists(self, s):
        r = s.get(f"{API}/marketplace/listings", timeout=TIMEOUT_FAST)
        assert r.status_code != 404

    def test_challenges_route_exists(self, s):
        r = s.get(f"{API}/challenges", timeout=TIMEOUT_FAST)
        assert r.status_code != 404

    def test_auth_route_exists(self, s):
        r = s.post(f"{API}/auth/login", json={}, timeout=TIMEOUT_FAST)
        # 422 expected for empty body, NOT 404
        assert r.status_code != 404
