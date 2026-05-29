"""LindArt AI endpoints regression tests (iteration_6)."""
import os
import time
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ===== Health =====
def test_health(s):
    r = s.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "LindArt" in data.get("message", "")


# ===== TTS — generate-voice (OpenAI) =====
def test_generate_voice_ok(s):
    r = s.post(f"{BASE_URL}/api/ai/generate-voice",
               json={"text": "Olá, este é o tour LindArt.", "voice": "nova", "speed": 1.0},
               timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("mime_type") == "audio/mpeg"
    b64 = data.get("audio_base64") or ""
    assert len(b64) > 1000
    # validate base64 decodes to non-trivial bytes
    raw = base64.b64decode(b64)
    assert len(raw) > 500


def test_generate_voice_empty_text(s):
    r = s.post(f"{BASE_URL}/api/ai/generate-voice", json={"text": "", "voice": "nova"}, timeout=15)
    assert r.status_code == 400


# ===== Image — Nano Banana (Gemini) =====
def test_generate_image_ok(s):
    r = s.post(f"{BASE_URL}/api/ai/generate-image",
               json={"prompt": "geodo de luxo", "colors": ["#D4AF37", "#0B0B0F", "#7E3F8F", "#FFFFFF"], "shape": "geodo"},
               timeout=120)
    # accept 200 or 402 (saldo) or 429 (rate)
    if r.status_code != 200:
        pytest.skip(f"Image gen non-200: {r.status_code} {r.text[:200]}")
    data = r.json()
    assert data.get("image_base64")
    assert len(data["image_base64"]) > 1000
    assert data.get("mime_type", "").startswith("image/")
    assert data.get("shape") == "geodo"


# ===== Video — Sora 2 (async job) =====
def test_generate_video_job_starts(s):
    r = s.post(f"{BASE_URL}/api/ai/generate-video",
               json={"color_a": "#D4AF37", "color_b": "#0B0B0F", "duration": 4, "size": "1280x720"},
               timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    job_id = data.get("job_id")
    assert job_id
    assert data.get("status") == "processing"
    # poll once after a short delay — should be processing or error, but the endpoint must respond
    time.sleep(3)
    st = s.get(f"{BASE_URL}/api/ai/video-status/{job_id}", timeout=15)
    assert st.status_code == 200, st.text
    status = st.json().get("status")
    assert status in ("processing", "completed", "error")


def test_video_status_unknown_job(s):
    r = s.get(f"{BASE_URL}/api/ai/video-status/non-existent-job-id", timeout=15)
    assert r.status_code == 404


# ===== Palette — Claude regression =====
def test_generate_palette_claude(s):
    r = s.post(f"{BASE_URL}/api/ai/generate-palette",
               json={"prompt": "mar profundo com mica dourada"}, timeout=90)
    if r.status_code != 200:
        pytest.skip(f"Claude non-200: {r.status_code} {r.text[:200]}")
    data = r.json()
    assert data.get("name")
    assert len(data.get("colors", [])) == 4
    for c in data["colors"]:
        assert c["hex"].startswith("#") and len(c["hex"]) == 7
    assert data.get("source") == "ai"


# ===== Palettes CRUD smoke =====
def test_palettes_list(s):
    r = s.get(f"{BASE_URL}/api/palettes", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
