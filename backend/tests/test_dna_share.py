"""Backend tests for the DNA share endpoints (Iteração 12)."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resina-palette-craft.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


SAMPLE_DNA = {
    "signature": "Linguagem sofisticada e silenciosa.",
    "mood": ["refinado", "autoral", "intencional"],
    "recommendations": ["dica 1", "dica 2"],
    "next_palette": ["#11223A", "#C5A572", "#F1ECE0", "#3A2A20", "#8E6A55"],
    "dominant": [{"hex": "#11223A", "weight": 0.4}, {"hex": "#C5A572", "weight": 0.3}],
    "stats": {"palettes": 3, "colors": 12, "favorites": 1},
    "style_breakdown": [{"style": "luxo", "count": 2}],
    "avg": {"contrast": 70, "harmony": 80, "depth": 75, "sophistication": 85, "luxury": 77},
}


# === POST /api/dna/share ===
class TestDnaShareCreate:
    def test_create_share_with_handle(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/dna/share",
            json={"payload": SAMPLE_DNA, "handle": "TEST_lindart"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str) and len(data["id"]) >= 6
        assert data["path"] == f"/dna/{data['id']}"

        # GET verifies persistence
        g = api_client.get(f"{BASE_URL}/api/dna/share/{data['id']}")
        assert g.status_code == 200
        gd = g.json()
        assert gd["id"] == data["id"]
        assert gd["handle"] == "TEST_lindart"
        assert gd["payload"]["signature"] == SAMPLE_DNA["signature"]
        assert "created_at" in gd
        assert "_id" not in gd  # mongo ObjectId must be excluded

    def test_create_share_without_handle(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/dna/share", json={"payload": SAMPLE_DNA})
        assert r.status_code == 200
        share_id = r.json()["id"]
        g = api_client.get(f"{BASE_URL}/api/dna/share/{share_id}")
        assert g.status_code == 200
        assert g.json()["handle"] is None

    def test_create_share_empty_payload_rejected(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/dna/share", json={"payload": {}})
        assert r.status_code == 400

    def test_create_share_missing_payload_rejected(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/dna/share", json={})
        assert r.status_code in (400, 422)


# === GET /api/dna/share/{id} ===
class TestDnaShareGet:
    def test_get_invalid_id_returns_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/dna/share/idinvalido123")
        assert r.status_code == 404
        assert "detail" in r.json()

    def test_handle_truncation(self, api_client):
        long_handle = "a" * 80
        r = api_client.post(
            f"{BASE_URL}/api/dna/share",
            json={"payload": SAMPLE_DNA, "handle": long_handle},
        )
        assert r.status_code == 200
        sid = r.json()["id"]
        g = api_client.get(f"{BASE_URL}/api/dna/share/{sid}")
        assert g.status_code == 200
        assert len(g.json()["handle"]) <= 40
