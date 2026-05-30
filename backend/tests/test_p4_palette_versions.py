"""P4 Palette Versioning regression tests.

Covers:
- GET versions empty state for fresh palette
- POST manual version creation
- PATCH auto-snapshot on versionable field change
- Restore creates auto-snapshot of current BEFORE restoring
- DELETE version, including "last version" guard (400 PT-BR)
- FIFO of auto-snapshots (limit=20)
"""
from __future__ import annotations

import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


def _color(hex_, name="Cor", role="detalhe"):
    return {"hex": hex_, "name": name, "role": role}


@pytest.fixture
def fresh_palette():
    """Create a TEST_ prefixed palette; cleanup after test."""
    payload = {
        "name": "TEST_p4_versioning",
        "description": "regressao P4",
        "colors": [_color("#111111", "Preto"), _color("#FFD700", "Ouro")],
        "style": "luxo",
        "tags": ["test"],
        "favorite": False,
        "source": "user",
    }
    r = requests.post(f"{API}/palettes", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    palette = r.json()
    yield palette
    # teardown
    try:
        requests.delete(f"{API}/palettes/{palette['id']}", timeout=15)
    except Exception:
        pass


class TestPaletteVersions:
    def test_empty_versions_on_new_palette(self, fresh_palette):
        r = requests.get(f"{API}/palettes/{fresh_palette['id']}/versions", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["versions"] == []
        assert data["total"] == 0
        assert data["palette_id"] == fresh_palette["id"]

    def test_manual_version_create(self, fresh_palette):
        pid = fresh_palette["id"]
        r = requests.post(
            f"{API}/palettes/{pid}/versions",
            json={"label": "Marco inicial"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        v = r.json()
        assert v["kind"] == "manual"
        assert v["label"] == "Marco inicial"
        assert v["palette_id"] == pid
        assert v["version_number"] >= 1
        # GET to confirm persistence
        lst = requests.get(f"{API}/palettes/{pid}/versions", timeout=15).json()
        assert lst["total"] == 1
        assert lst["versions"][0]["id"] == v["id"]
        # Snapshot has versionable fields
        snap = lst["versions"][0]["snapshot"]
        assert snap["name"] == "TEST_p4_versioning"
        assert len(snap["colors"]) == 2

    def test_patch_creates_auto_snapshot(self, fresh_palette):
        pid = fresh_palette["id"]
        # change name (versionable)
        r = requests.patch(
            f"{API}/palettes/{pid}", json={"name": "TEST_p4_renamed"}, timeout=15
        )
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "TEST_p4_renamed"
        # one auto version should exist with OLD name
        lst = requests.get(f"{API}/palettes/{pid}/versions", timeout=15).json()
        auto = [v for v in lst["versions"] if v["kind"] == "auto"]
        assert len(auto) == 1
        assert auto[0]["snapshot"]["name"] == "TEST_p4_versioning"

    def test_patch_no_auto_when_unchanged_field(self, fresh_palette):
        pid = fresh_palette["id"]
        # favorite is NOT a versionable field
        r = requests.patch(f"{API}/palettes/{pid}", json={"favorite": True}, timeout=15)
        assert r.status_code == 200
        lst = requests.get(f"{API}/palettes/{pid}/versions", timeout=15).json()
        assert lst["total"] == 0

    def test_restore_creates_pre_snapshot(self, fresh_palette):
        pid = fresh_palette["id"]
        # 1) create manual version of initial state
        v1 = requests.post(
            f"{API}/palettes/{pid}/versions", json={"label": "v1 inicial"}, timeout=15
        ).json()
        # 2) mutate palette
        requests.patch(f"{API}/palettes/{pid}", json={"name": "TEST_p4_mut1"}, timeout=15)
        # auto snapshot of original was created. Now we restore v1.
        before_restore = requests.get(f"{API}/palettes/{pid}/versions", timeout=15).json()
        autos_before = len([v for v in before_restore["versions"] if v["kind"] == "auto"])
        # restore
        r = requests.post(
            f"{API}/palettes/{pid}/versions/{v1['id']}/restore", timeout=15
        )
        assert r.status_code == 200, r.text
        restored = r.json()
        assert restored["name"] == "TEST_p4_versioning"
        # auto snapshot count must have increased by 1 (pre-restore state)
        after_restore = requests.get(f"{API}/palettes/{pid}/versions", timeout=15).json()
        autos_after = len([v for v in after_restore["versions"] if v["kind"] == "auto"])
        assert autos_after == autos_before + 1
        # The latest auto should reference v1 in label
        latest_auto = next(v for v in after_restore["versions"] if v["kind"] == "auto")
        assert "restaurar" in latest_auto["label"].lower()

    def test_delete_version(self, fresh_palette):
        pid = fresh_palette["id"]
        v1 = requests.post(
            f"{API}/palettes/{pid}/versions", json={"label": "v1"}, timeout=15
        ).json()
        v2 = requests.post(
            f"{API}/palettes/{pid}/versions", json={"label": "v2"}, timeout=15
        ).json()
        r = requests.delete(f"{API}/palettes/{pid}/versions/{v2['id']}", timeout=15)
        assert r.status_code == 200
        assert r.json()["deleted"] is True
        # v2 gone
        lst = requests.get(f"{API}/palettes/{pid}/versions", timeout=15).json()
        ids = [v["id"] for v in lst["versions"]]
        assert v1["id"] in ids and v2["id"] not in ids

    def test_cannot_delete_last_version_pt_br(self, fresh_palette):
        pid = fresh_palette["id"]
        v1 = requests.post(
            f"{API}/palettes/{pid}/versions", json={"label": "única"}, timeout=15
        ).json()
        r = requests.delete(f"{API}/palettes/{pid}/versions/{v1['id']}", timeout=15)
        assert r.status_code == 400, r.text
        msg = r.json().get("detail", "")
        assert "Não é possível remover a última versão" in msg

    def test_auto_snapshot_fifo_limit_20(self, fresh_palette):
        pid = fresh_palette["id"]
        # Generate 22 versionable PATCHes (alternating name to ensure change)
        for i in range(22):
            new_name = f"TEST_p4_iter_{i}"
            r = requests.patch(f"{API}/palettes/{pid}", json={"name": new_name}, timeout=15)
            assert r.status_code == 200
        lst = requests.get(f"{API}/palettes/{pid}/versions", timeout=15).json()
        autos = [v for v in lst["versions"] if v["kind"] == "auto"]
        assert len(autos) == 20, f"Expected 20 autos after FIFO, got {len(autos)}"
        # Most recent auto's snapshot should be the next-to-last name
        # autos are returned sorted desc by created_at -> highest version_number first
        nums = [v["version_number"] for v in autos]
        assert nums == sorted(nums, reverse=True)
