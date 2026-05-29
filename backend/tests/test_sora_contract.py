"""Sora 2 (video) endpoint contract tests.

Only validates the API contract:
- POST /api/ai/generate-video -> {job_id, status}
- GET  /api/ai/video-status/{job_id} -> {status, ...}
Does NOT wait for completion (Sora can take minutes).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://resina-palette-craft.preview.emergentagent.com",
).rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def test_generate_video_returns_job_id(s):
    r = s.post(
        f"{BASE_URL}/api/ai/generate-video",
        json={"color_a": "#0B2545", "color_b": "#EEF4ED", "duration": 4, "size": "1280x720"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("job_id"), str) and len(data["job_id"]) > 8
    assert data.get("status") in ("processing", "completed", "error")
    # stash for next test via module-level
    pytest._sora_job_id = data["job_id"]


def test_video_status_contract(s):
    job_id = getattr(pytest, "_sora_job_id", None)
    if not job_id:
        pytest.skip("no job_id from previous test")
    r = s.get(f"{BASE_URL}/api/ai/video-status/{job_id}", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") in ("processing", "completed", "error")


def test_video_status_unknown_job_404(s):
    r = s.get(f"{BASE_URL}/api/ai/video-status/non-existent-id-xyz", timeout=15)
    assert r.status_code == 404
