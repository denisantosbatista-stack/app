"""Tests for P1 Image Generation Update: vision-based palette extraction."""
import os
import io
import base64
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"


def _make_sunset_jpeg_b64(width=64, height=64) -> str:
    """Generate a small sunset-gradient JPEG (~few KB) as base64 string."""
    img = Image.new("RGB", (width, height))
    px = img.load()
    for y in range(height):
        t = y / max(1, height - 1)
        # sunset: orange→pink→purple
        r = int(255 * (1 - 0.5 * t))
        g = int(120 * (1 - t))
        b = int(80 + 120 * t)
        for x in range(width):
            px[x, y] = (r, g, b)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode("ascii")


HEX_RE = __import__("re").compile(r"^#[0-9A-Fa-f]{6}$")


def _assert_valid_palette(data: dict):
    assert "name" in data and isinstance(data["name"], str) and data["name"]
    assert "colors" in data and isinstance(data["colors"], list)
    assert len(data["colors"]) == 4, f"Expected 4 colors, got {len(data['colors'])}"
    roles = []
    for c in data["colors"]:
        assert HEX_RE.match(c["hex"]), f"Invalid hex: {c['hex']}"
        assert c.get("name")
        roles.append(c["role"])
    assert roles == ["principal", "acento", "detalhe", "veios"], f"Roles: {roles}"
    assert data.get("source") == "ai"


# --- 1) Prompt-only (regression) ---
def test_generate_palette_prompt_only():
    r = requests.post(
        f"{API}/ai/generate-palette",
        json={"prompt": "oceano cristalino dourado"},
        timeout=90,
    )
    assert r.status_code == 200, r.text
    _assert_valid_palette(r.json())


# --- 2) Image-only (vision) ---
def test_generate_palette_image_only():
    b64 = _make_sunset_jpeg_b64()
    r = requests.post(
        f"{API}/ai/generate-palette",
        json={"image_base64": b64},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    _assert_valid_palette(data)


# --- 3) Prompt + image ---
def test_generate_palette_prompt_and_image():
    b64 = _make_sunset_jpeg_b64()
    r = requests.post(
        f"{API}/ai/generate-palette",
        json={"prompt": "tons mais quentes e luxuosos", "image_base64": b64},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    _assert_valid_palette(r.json())


# --- 4) Neither prompt nor image -> 400 ---
def test_generate_palette_empty_returns_400():
    r = requests.post(
        f"{API}/ai/generate-palette",
        json={"prompt": "   "},
        timeout=30,
    )
    assert r.status_code == 400, r.text
    body = r.json()
    assert "detail" in body


# --- 5) data:image/jpeg;base64,... header is handled ---
def test_generate_palette_data_url_header_stripped():
    b64 = _make_sunset_jpeg_b64()
    data_url = f"data:image/jpeg;base64,{b64}"
    r = requests.post(
        f"{API}/ai/generate-palette",
        json={"image_base64": data_url},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    _assert_valid_palette(r.json())


# --- 6) /api/ai/generate-image smoke test with colors ---
def test_generate_image_with_colors_smoke():
    r = requests.post(
        f"{API}/ai/generate-image",
        json={
            "prompt": "gota luxuosa",
            "colors": ["#0A9FB5", "#D4AF37"],
            "shape": "gota",
        },
        timeout=120,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("image_base64"), "image_base64 missing"
    assert len(data["image_base64"]) > 500
