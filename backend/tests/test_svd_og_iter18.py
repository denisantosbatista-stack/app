"""Iteration 18 — SVD 2.0 + OG absolute URLs + Feed smoke.

Cobre:
- POST /api/ai/generate-video → 503 + msg clara mencionando FAL_KEY quando FAL_KEY ausente
- GET /api/ai/video-status/{inexistente} → 404 com detail 'Job não encontrado'
- POST /api/dna/share + GET /api/og/dna/{share_id} → HTML válido com og:image, og:url, twitter:image absolutos (https://)
- GET /api/og/dna/{share_id}/image.svg → content-type image/svg+xml
- GET /api/og/dna/inexistente123 → 404 com HTML de fallback (og tags presentes)
- GET /api/feed → 200 (array vazio aceito) e estrutura suporta is_pick
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ============ SVD 2.0 video generation =============
class TestSVDVideoGeneration:
    def test_generate_video_returns_503_without_fal_key(self, client):
        r = client.post(
            f"{BASE_URL}/api/ai/generate-video",
            json={"color_a": "#D4AF37", "color_b": "#0F4C3A", "duration": 4},
        )
        assert r.status_code == 503, f"Esperado 503, recebido {r.status_code}. Body={r.text[:300]}"
        body = r.json()
        detail = (body.get("detail") or "").lower()
        assert "fal_key" in detail, f"detail deve mencionar FAL_KEY. recebido: {body}"

    def test_video_status_not_found_returns_404(self, client):
        r = client.get(f"{BASE_URL}/api/ai/video-status/nao-existe-xyz")
        assert r.status_code == 404, f"Esperado 404 para job inexistente, recebido {r.status_code}"
        body = r.json()
        # PT-BR
        assert "não encontrado" in (body.get("detail") or "").lower() or "nao encontrado" in (body.get("detail") or "").lower()


# ============ DNA Share + OG tags ABSOLUTAS =============
class TestDNAShareOGAbsoluteUrls:
    @pytest.fixture(scope="class")
    def share_id(self, client):
        payload = {
            "payload": {
                "signature": "TEST_DNA_iter18",
                "mood": ["Terroso", "Místico"],
                "dominant_colors": ["#D4AF37", "#0F4C3A", "#1a1a1a", "#f4f1ea"],
            },
            "handle": "@lindart_test",
        }
        r = client.post(f"{BASE_URL}/api/dna/share", json=payload)
        assert r.status_code == 200, f"POST /api/dna/share falhou: {r.status_code} {r.text[:200]}"
        sid = r.json().get("id")
        assert sid and isinstance(sid, str) and len(sid) >= 6
        return sid

    def test_og_html_contains_absolute_urls(self, client, share_id):
        r = client.get(f"{BASE_URL}/api/og/dna/{share_id}")
        assert r.status_code == 200, f"OG page status {r.status_code}"
        assert "text/html" in (r.headers.get("content-type") or "")
        html = r.text

        # Extrai meta property=og:image
        og_image = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
        og_url = re.search(r'<meta\s+property=["\']og:url["\']\s+content=["\']([^"\']+)["\']', html)
        tw_image = re.search(r'<meta\s+name=["\']twitter:image["\']\s+content=["\']([^"\']+)["\']', html)

        assert og_image, "Faltando <meta property='og:image'>"
        assert og_url, "Faltando <meta property='og:url'>"
        assert tw_image, "Faltando <meta name='twitter:image'>"

        for label, m in [("og:image", og_image), ("og:url", og_url), ("twitter:image", tw_image)]:
            val = m.group(1)
            assert val.startswith("https://"), f"{label} não absoluto (esperado https://): {val}"

        # og:url contém share_id, og:image aponta para /api/og/dna/{share_id}/image.svg
        assert share_id in og_url.group(1), f"og:url deveria conter share_id: {og_url.group(1)}"
        assert f"/api/og/dna/{share_id}/image.svg" in og_image.group(1)
        assert og_image.group(1) == tw_image.group(1), "og:image e twitter:image devem ser idênticos"

    def test_og_image_svg_content_type(self, client, share_id):
        r = client.get(f"{BASE_URL}/api/og/dna/{share_id}/image.svg")
        assert r.status_code == 200
        ctype = (r.headers.get("content-type") or "").lower()
        assert "image/svg+xml" in ctype, f"content-type incorreto: {ctype}"
        # body parece SVG
        assert r.text.lstrip().startswith("<") and "svg" in r.text[:200].lower()

    def test_og_fallback_for_unknown_share_id(self, client):
        r = client.get(f"{BASE_URL}/api/og/dna/inexistente123")
        assert r.status_code == 404, f"Esperado 404, recebido {r.status_code}"
        assert "text/html" in (r.headers.get("content-type") or "").lower()
        html = r.text
        assert "og:title" in html, "Fallback deve conter og:title"
        assert "og:url" in html, "Fallback deve conter og:url"


# ============ Feed =============
class TestFeed:
    def test_feed_returns_200(self, client):
        r = client.get(f"{BASE_URL}/api/feed")
        assert r.status_code == 200, f"Feed status {r.status_code}: {r.text[:200]}"
        data = r.json()
        # aceita array ou {items: []}
        items = data if isinstance(data, list) else (data.get("items") or data.get("posts") or [])
        assert isinstance(items, list)
        # se houver posts, verifica que campo is_pick existe (ou pode existir)
        for p in items[:5]:
            assert isinstance(p, dict)
            # is_pick não é obrigatório em todos os posts; apenas validamos type quando presente
            if "is_pick" in p:
                assert isinstance(p["is_pick"], bool)
