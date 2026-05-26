"""
LindArt backend API tests.

Covers:
- Health check (GET /api/)
- AI palette generation (POST /api/ai/generate-palette) using Claude Sonnet 4.5 via Emergent
- CRUD on /api/palettes (POST, GET, GET ?favorite=true, PATCH, DELETE)
- 404 for invalid palette id
- Response serialization without MongoDB ObjectId (_id absent)
"""
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
VALID_ROLES = {"principal", "acento", "detalhe", "veios"}


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def sample_palette_payload():
    return {
        "name": "TEST_Oceano Cristalino",
        "description": "Paleta de teste",
        "colors": [
            {"hex": "#0A2540", "name": "Azul Profundo", "role": "principal"},
            {"hex": "#1E90FF", "name": "Cristal", "role": "acento"},
            {"hex": "#F5F7FA", "name": "Espuma", "role": "detalhe"},
            {"hex": "#C0C0C0", "name": "Prata Líquida", "role": "veios"},
        ],
        "style": "oceano",
        "tags": ["oceano", "luxo"],
        "favorite": False,
        "source": "user",
    }


# ---------- Health ----------
class TestHealth:
    def test_root_status(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "message" in body
        assert "LindArt" in body["message"] or "online" in body["message"].lower()


# ---------- CRUD ----------
class TestPaletteCRUD:
    created_ids = []

    def test_create_palette(self, session, sample_palette_payload):
        r = session.post(f"{API}/palettes", json=sample_palette_payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str) and len(data["id"]) > 0
        # Ensure UUID-like
        try:
            uuid.UUID(data["id"])
        except ValueError:
            pytest.fail(f"id is not a valid UUID: {data['id']}")
        assert "_id" not in data, "MongoDB _id should not leak"
        assert data["name"] == sample_palette_payload["name"]
        assert len(data["colors"]) == 4
        TestPaletteCRUD.created_ids.append(data["id"])

    def test_list_palettes(self, session):
        r = session.get(f"{API}/palettes", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # No ObjectId leakage in any item
        for item in data:
            assert "_id" not in item
            assert "id" in item
        # The one we just created should appear
        ids = [p["id"] for p in data]
        assert TestPaletteCRUD.created_ids[0] in ids

    def test_filter_favorites_excludes_non_favorite(self, session):
        r = session.get(f"{API}/palettes", params={"favorite": "true"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for p in data:
            assert p["favorite"] == True  # noqa: E712

    def test_patch_palette_favorite_and_tags(self, session):
        pid = TestPaletteCRUD.created_ids[0]
        r = session.patch(
            f"{API}/palettes/{pid}",
            json={"favorite": True, "tags": ["oceano", "premium", "TEST"]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == pid
        assert data["favorite"] == True  # noqa: E712
        assert "premium" in data["tags"]
        assert "_id" not in data

    def test_filter_favorites_includes_updated(self, session):
        pid = TestPaletteCRUD.created_ids[0]
        r = session.get(f"{API}/palettes", params={"favorite": "true"}, timeout=15)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert pid in ids

    def test_patch_invalid_id_returns_404(self, session):
        r = session.patch(
            f"{API}/palettes/{uuid.uuid4()}",
            json={"favorite": True},
            timeout=15,
        )
        assert r.status_code == 404

    def test_get_invalid_id_via_delete_404(self, session):
        # No GET-by-id endpoint exists; assert DELETE returns 404 for unknown id
        r = session.delete(f"{API}/palettes/{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404

    def test_delete_palette(self, session):
        pid = TestPaletteCRUD.created_ids[0]
        r = session.delete(f"{API}/palettes/{pid}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("deleted") == True  # noqa: E712
        assert body.get("id") == pid

        # Verify removal from list
        r2 = session.get(f"{API}/palettes", timeout=15)
        assert r2.status_code == 200
        ids = [p["id"] for p in r2.json()]
        assert pid not in ids


# ---------- AI ----------
class TestAIPaletteGeneration:
    def test_generate_palette_pt_br(self, session):
        payload = {"prompt": "oceano cristalino luxuoso"}
        r = session.post(f"{API}/ai/generate-palette", json=payload, timeout=90)
        assert r.status_code == 200, f"Status {r.status_code} body={r.text[:500]}"
        data = r.json()

        # Required fields
        assert "id" in data and isinstance(data["id"], str)
        assert "_id" not in data
        assert isinstance(data.get("name"), str) and len(data["name"]) > 0
        assert isinstance(data.get("style"), str) and len(data["style"]) > 0
        assert isinstance(data.get("tags"), list) and len(data["tags"]) >= 1
        assert data.get("source") == "ai"

        # Exactly 4 colors with valid hex + roles
        colors = data.get("colors", [])
        assert len(colors) == 4, f"Expected 4 colors, got {len(colors)}"
        roles_seen = []
        for c in colors:
            assert HEX_RE.match(c["hex"]), f"Invalid hex: {c['hex']}"
            assert isinstance(c["name"], str) and len(c["name"]) > 0
            assert c["role"] in VALID_ROLES, f"Invalid role: {c['role']}"
            roles_seen.append(c["role"])
        # All 4 expected roles should be present
        assert set(roles_seen) == VALID_ROLES, f"Roles mismatch: {roles_seen}"
