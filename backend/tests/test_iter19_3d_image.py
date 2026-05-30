"""Iter 19 — Validação dos fixes do Productions3D + /api/ai/generate-image com style/palette_name."""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")
TIMEOUT = 90


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- /api/ai/generate-image with style + palette_name -----------------------
@pytest.mark.parametrize("style", ["geodo", "marmore", "oceano", "galaxia"])
def test_generate_image_with_style(session, style):
    """Backend deve aceitar style + palette_name e retornar PNG base64 válido."""
    payload = {
        "prompt": f"Peça em geodo estilo {style}",
        "colors": ["#102A43", "#D4AF37", "#F8F4EC"],
        "shape": "geodo",
        "style": style,
        "palette_name": f"TEST_{style}_iter19",
    }
    r = session.post(f"{BASE_URL}/api/ai/generate-image", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, f"style={style} status={r.status_code} body={r.text[:300]}"
    data = r.json()
    assert "image_base64" in data, f"missing image_base64 in {data.keys()}"
    assert isinstance(data["image_base64"], str) and len(data["image_base64"]) > 1000
    # decode sanity
    try:
        raw = base64.b64decode(data["image_base64"][:200] + "==")
        assert len(raw) > 10
    except Exception as e:
        pytest.fail(f"image_base64 não decodifica: {e}")
    assert data.get("mime_type", "image/png").startswith("image/")


def test_generate_image_minimal_payload(session):
    """Smoke: ainda aceita payload mínimo (sem style/palette_name)."""
    r = session.post(
        f"{BASE_URL}/api/ai/generate-image",
        json={"prompt": "peça", "colors": ["#000000"], "shape": "geodo"},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, r.text[:300]
    assert "image_base64" in r.json()


# --- Smoke check: outras rotas API que a UI consome ------------------------
@pytest.mark.parametrize("path", ["/api/feed", "/api/marketplace", "/api/challenges"])
def test_list_routes_smoke(session, path):
    r = session.get(f"{BASE_URL}{path}", timeout=30)
    assert r.status_code in (200, 404), f"{path} -> {r.status_code}"
    if r.status_code == 200:
        body = r.json()
        assert isinstance(body, (list, dict))
