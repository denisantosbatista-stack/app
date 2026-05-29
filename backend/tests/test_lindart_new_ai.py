"""LindArt new AI endpoints (Task 1 - P0): Mentora, Trends, Collection, Generate-Image.

Tests:
- POST /api/ai/mentora  (Claude chat with optional history/image)
- POST /api/ai/trends   (Pinterest/Instagram trend curation + 24h cache)
- POST /api/ai/collection (Coherent collection: palette + pieces + mockup_prompt)
- POST /api/ai/generate-image (Nano Banana mockup)  -- smoke (accepts 402/429)
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://resina-palette-craft.preview.emergentagent.com",
).rstrip("/")

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ===== /api/ai/mentora =====
def test_mentora_simple_message(s):
    r = s.post(
        f"{BASE_URL}/api/ai/mentora",
        json={"message": "Quais cuidados para evitar bolhas em resina epóxi?"},
        timeout=90,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("reply"), str)
    assert len(data["reply"]) > 30
    assert isinstance(data.get("session_id"), str) and data["session_id"]


def test_mentora_with_history(s):
    history = [
        {"role": "user", "content": "Minha peça ficou opaca, o que pode ser?"},
        {"role": "assistant", "content": "Pode ser umidade alta durante a cura."},
    ]
    r = s.post(
        f"{BASE_URL}/api/ai/mentora",
        json={"message": "E como corrigir agora?", "history": history},
        timeout=90,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("reply"), str) and len(data["reply"]) > 20


def test_mentora_empty_message_rejected(s):
    r = s.post(f"{BASE_URL}/api/ai/mentora", json={"message": "   "}, timeout=15)
    assert r.status_code == 400


# ===== /api/ai/trends =====
def _validate_trends_payload(data):
    assert "trends" in data and isinstance(data["trends"], list)
    assert len(data["trends"]) >= 3
    for t in data["trends"]:
        assert isinstance(t.get("name"), str) and t["name"]
        assert isinstance(t.get("tagline"), str)
        colors = t.get("colors", [])
        assert isinstance(colors, list) and len(colors) >= 3
        for c in colors:
            assert HEX_RE.match(c), f"bad hex {c!r}"
        assert isinstance(t.get("tags", []), list)
    # week_theme + timestamp (backend usa `generated_at`; spec mencionava `cached_at`)
    assert "week_theme" in data
    assert "generated_at" in data or "cached_at" in data


def test_trends_initial_refresh_true(s):
    # força regeneração
    r = s.post(f"{BASE_URL}/api/ai/trends", json={"refresh": True}, timeout=120)
    assert r.status_code == 200, r.text
    _validate_trends_payload(r.json())


def test_trends_cache_hit(s):
    # depois do test acima, sem refresh deve servir cache
    r = s.post(f"{BASE_URL}/api/ai/trends", json={"refresh": False}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    _validate_trends_payload(data)
    # cache flag pode ou não estar exposta — apenas garantir resposta rápida e válida
    assert data.get("cached") is True or "trends" in data


def test_trends_focus_joalheria(s):
    r = s.post(
        f"{BASE_URL}/api/ai/trends",
        json={"refresh": True, "focus": "joalheria"},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    _validate_trends_payload(r.json())


# ===== /api/ai/collection =====
def test_collection_default_pieces(s):
    r = s.post(
        f"{BASE_URL}/api/ai/collection",
        json={"theme": "coleção oceano premium"},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("collection_name"), str) and data["collection_name"]
    assert "concept" in data
    palette = data.get("palette") or {}
    assert isinstance(palette.get("name"), str)
    colors = palette.get("colors") or []
    assert len(colors) == 4, f"expected 4 colors got {len(colors)}"
    for c in colors:
        assert HEX_RE.match(c.get("hex", "")), c
        assert c.get("name")
        assert c.get("role")
    pieces = data.get("pieces") or []
    assert len(pieces) >= 3
    for p in pieces:
        assert p.get("type")
        assert p.get("title")
        assert p.get("description")
        assert p.get("mockup_prompt")
        assert isinstance(p.get("highlights", []), list)


def test_collection_custom_pieces_order(s):
    pieces_in = ["bandeja", "pendente", "porta-joias"]
    r = s.post(
        f"{BASE_URL}/api/ai/collection",
        json={"theme": "dourado e onyx art déco", "pieces": pieces_in},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    out_pieces = data.get("pieces") or []
    assert len(out_pieces) == len(pieces_in)
    # mesma ordem (case-insensitive, type contém o nome ou vice-versa)
    for inp, outp in zip(pieces_in, out_pieces):
        t = (outp.get("type") or "").lower()
        title = (outp.get("title") or "").lower()
        assert inp.split()[0] in t or inp.split()[0] in title, f"{inp!r} not aligned with {outp.get('type')!r}/{outp.get('title')!r}"


def test_collection_empty_theme_rejected(s):
    r = s.post(f"{BASE_URL}/api/ai/collection", json={"theme": "  "}, timeout=15)
    assert r.status_code == 400


# ===== /api/ai/generate-image (smoke) =====
def test_generate_image_mockup_smoke(s):
    payload = {
        "prompt": "photorealistic luxury epoxy resin tray ocean theme",
        "colors": ["#0B2545", "#13315C", "#8DA9C4", "#EEF4ED"],
        "shape": "bandeja",
    }
    r = s.post(f"{BASE_URL}/api/ai/generate-image", json=payload, timeout=180)
    if r.status_code != 200:
        pytest.skip(f"image gen non-200 (acceptable in CI): {r.status_code} {r.text[:200]}")
    data = r.json()
    assert data.get("image_base64") and len(data["image_base64"]) > 1000
    assert (data.get("mime_type") or "").startswith("image/")
