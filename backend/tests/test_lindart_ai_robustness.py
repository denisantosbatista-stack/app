"""Iteration 13 — AI endpoints robustness tests.

Focus:
- /api/ai/generate-palette returns valid Palette (200)
- /api/ai/generate-caption never returns 502 (has deterministic fallback)
- /api/ai/luxury-score returns full structure
- /api/ai/visual-dna returns signature/mood/recommendations/next_palette
- /api/dna/share + GET /api/dna/share/{id}
"""
import os
import re
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Fallback: read frontend/.env directly
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
    assert url, "REACT_APP_BACKEND_URL not set"
    return url.rstrip("/")


BASE_URL = _load_base_url()
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def test_health(s):
    r = s.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    assert "LindArt" in r.json().get("message", "")


# ===== generate-palette =====
def test_generate_palette_returns_valid_palette(s):
    r = s.post(
        f"{BASE_URL}/api/ai/generate-palette",
        json={"prompt": "mar profundo com mica dourada e veios pretos"},
        timeout=90,
    )
    if r.status_code in (402, 429):
        pytest.skip(f"LLM transient: {r.status_code} {r.text[:120]}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"]
    assert isinstance(data["colors"], list)
    assert len(data["colors"]) >= 3
    for c in data["colors"]:
        assert HEX_RE.match(c["hex"]), c
        assert c["name"]
        assert c["role"]
    assert data["source"] == "ai"


# ===== generate-caption — MUST NOT return 502 =====
def test_generate_caption_never_502(s):
    r = s.post(
        f"{BASE_URL}/api/ai/generate-caption",
        json={
            "palette_name": "Galaxia Profunda",
            "colors": ["#0B0B0F", "#7E3F8F", "#D4AF37", "#FFFFFF"],
            "piece": "colar gota",
            "style": "luxo",
            "platform": "instagram",
            "tone": "luxuoso",
            "language": "pt-BR",
        },
        timeout=90,
    )
    # Critical: 502 means parser fallback failed. Must NEVER happen.
    assert r.status_code != 502, f"502 leaked: {r.text[:200]}"
    if r.status_code in (402, 429):
        pytest.skip(f"LLM transient: {r.status_code}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("headline"), str) and data["headline"].strip()
    assert isinstance(data.get("caption"), str) and data["caption"].strip()
    assert isinstance(data.get("hashtags"), list) and len(data["hashtags"]) >= 1
    for tag in data["hashtags"]:
        assert isinstance(tag, str) and tag.startswith("#")
    assert isinstance(data.get("alt_text"), str)
    assert isinstance(data.get("cta"), str)
    assert data.get("platform") == "instagram"


def test_generate_caption_missing_colors_400(s):
    r = s.post(f"{BASE_URL}/api/ai/generate-caption",
               json={"colors": [], "piece": "anel"}, timeout=15)
    assert r.status_code == 400


def test_generate_caption_etsy_platform(s):
    r = s.post(
        f"{BASE_URL}/api/ai/generate-caption",
        json={"colors": ["#1A1A1A", "#C0A062", "#F5F2EA"], "platform": "etsy", "tone": "minimalista"},
        timeout=90,
    )
    assert r.status_code != 502
    if r.status_code in (402, 429):
        pytest.skip(f"LLM transient: {r.status_code}")
    assert r.status_code == 200
    data = r.json()
    assert data["platform"] == "etsy"


# ===== luxury-score =====
def test_luxury_score_full_structure(s):
    r = s.post(
        f"{BASE_URL}/api/ai/luxury-score",
        json={
            "palette_name": "Onyx & Gold",
            "colors": ["#0B0B0F", "#D4AF37", "#F5F2EA", "#7A6235"],
            "style": "luxo",
            "description": "joia escura com acabamento dourado",
        },
        timeout=90,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data["score"], int)
    assert 0 <= data["score"] <= 100
    assert data["tier"] in ("Couture", "Atelier", "Premium", "Casual Chic", "Daily")
    assert isinstance(data["verdict"], str) and data["verdict"].strip()
    assert isinstance(data["suggestions"], list) and len(data["suggestions"]) >= 1
    metrics = data["metrics"]
    for k in ("contrast", "harmony", "depth", "sophistication"):
        assert k in metrics


def test_luxury_score_empty_colors_400(s):
    r = s.post(f"{BASE_URL}/api/ai/luxury-score", json={"colors": []}, timeout=15)
    assert r.status_code == 400


# ===== visual-dna =====
def test_visual_dna_full_structure(s):
    payload = {
        "palettes": [
            {
                "name": "Galaxia",
                "colors": [
                    {"hex": "#0B0B0F"}, {"hex": "#7E3F8F"},
                    {"hex": "#D4AF37"}, {"hex": "#FFFFFF"},
                ],
                "style": "galaxia",
                "favorite": True,
            },
            {
                "name": "Geodo",
                "colors": ["#1A1A1A", "#C0A062", "#F5F2EA"],
                "style": "geodo",
            },
        ]
    }
    r = s.post(f"{BASE_URL}/api/ai/visual-dna", json=payload, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data["signature"], str) and data["signature"].strip()
    assert isinstance(data["mood"], list) and len(data["mood"]) >= 1
    assert isinstance(data["recommendations"], list) and len(data["recommendations"]) >= 1
    assert isinstance(data["next_palette"], list) and len(data["next_palette"]) >= 1
    for hx in data["next_palette"]:
        assert HEX_RE.match(hx), hx
    assert data["stats"]["palettes"] == 2
    assert data["stats"]["favorites"] == 1


def test_visual_dna_empty_400(s):
    r = s.post(f"{BASE_URL}/api/ai/visual-dna", json={"palettes": []}, timeout=15)
    assert r.status_code == 400


# ===== DNA share =====
def test_dna_share_create_and_get(s):
    payload = {
        "payload": {
            "signature": "Linguagem refinada e profunda.",
            "mood": ["refinado", "autoral"],
            "next_palette": ["#0B0B0F", "#D4AF37", "#F5F2EA"],
        },
        "handle": "TEST_lindart",
    }
    r = s.post(f"{BASE_URL}/api/dna/share", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    share_id = data["id"]
    assert share_id
    assert data["path"] == f"/dna/{share_id}"

    # GET back
    g = s.get(f"{BASE_URL}/api/dna/share/{share_id}", timeout=15)
    assert g.status_code == 200
    got = g.json()
    assert got["id"] == share_id
    assert got["handle"] == "TEST_lindart"
    assert got["payload"]["signature"].startswith("Linguagem")
    assert "_id" not in got


def test_dna_share_404(s):
    r = s.get(f"{BASE_URL}/api/dna/share/nonexistentid", timeout=15)
    assert r.status_code == 404
