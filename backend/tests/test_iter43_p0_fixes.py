"""Iter 43 — P0 regression tests for backend mock filters + waitlist counter.

Coverage:
  - GET /api/feed: no mock-string docs, no duplicates
  - GET /api/marketplace: no mock-string docs
  - GET /api/challenges: no mock-string docs
  - GET /api/waitlist/count?categoria=fundadoras: 200 + payload shape
  - GET /api/waitlist/count (no categoria): graceful default
  - GET /api/podcasts?limit=3: endpoint may 404 (frontend handles silently)
"""
from __future__ import annotations

import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

MOCK_TOKENS = ("teste", "test_", "e2e", "refactor")
MOCK_RE = re.compile(r"(teste|test_|e2e|refactor)", re.IGNORECASE)


def _contains_mock(s: object) -> bool:
    if not isinstance(s, str):
        return False
    return bool(MOCK_RE.search(s))


def _doc_has_mock(d: dict, fields=("handle", "title", "caption", "description")) -> str | None:
    for f in fields:
        v = d.get(f)
        if isinstance(v, str) and _contains_mock(v):
            return f"{f}={v!r}"
    # tags is a list
    tags = d.get("tags") or []
    if isinstance(tags, list):
        for t in tags:
            if isinstance(t, str) and t.lower() in {"test", "teste", "e2e", "refactor"}:
                return f"tags contains {t!r}"
    return None


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- FEED ----------

class TestFeedMockFilter:
    def test_feed_returns_200(self, session):
        r = session.get(f"{BASE_URL}/api/feed?limit=120", timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_feed_no_mock_strings(self, session):
        r = session.get(f"{BASE_URL}/api/feed?limit=120", timeout=30)
        docs = r.json()
        offenders = []
        for d in docs:
            hit = _doc_has_mock(d)
            if hit:
                offenders.append({"id": d.get("id"), "hit": hit})
        assert not offenders, f"Mock docs leaked into /api/feed: {offenders[:5]}"

    def test_feed_no_duplicate_ids(self, session):
        r = session.get(f"{BASE_URL}/api/feed?limit=120", timeout=30)
        docs = r.json()
        ids = [d.get("id") for d in docs if d.get("id")]
        dupes = {i for i in ids if ids.count(i) > 1}
        assert not dupes, f"Duplicate feed post ids: {dupes}"


# ---------- MARKETPLACE ----------

class TestMarketplaceMockFilter:
    def test_marketplace_returns_200(self, session):
        r = session.get(f"{BASE_URL}/api/marketplace?limit=120", timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_marketplace_no_mock_strings(self, session):
        r = session.get(f"{BASE_URL}/api/marketplace?limit=120", timeout=30)
        docs = r.json()
        offenders = []
        for d in docs:
            hit = _doc_has_mock(d)
            if hit:
                offenders.append({"id": d.get("id"), "hit": hit})
        assert not offenders, f"Mock docs leaked into /api/marketplace: {offenders[:5]}"


# ---------- CHALLENGES ----------

class TestChallengesMockFilter:
    def test_challenges_returns_200(self, session):
        r = session.get(f"{BASE_URL}/api/challenges", timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_challenges_no_mock_strings(self, session):
        r = session.get(f"{BASE_URL}/api/challenges", timeout=30)
        docs = r.json()
        offenders = []
        for d in docs:
            hit = _doc_has_mock(d, fields=("title", "prompt"))
            if hit:
                offenders.append({"id": d.get("id"), "hit": hit})
        assert not offenders, f"Mock docs leaked into /api/challenges: {offenders[:5]}"


# ---------- WAITLIST COUNT ----------

class TestWaitlistCount:
    def test_count_fundadoras_returns_200(self, session):
        r = session.get(
            f"{BASE_URL}/api/waitlist/count?categoria=fundadoras", timeout=30
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("categoria") == "fundadoras"
        assert isinstance(data.get("count"), int)
        assert data["count"] >= 0

    def test_count_missing_categoria_defaults_all(self, session):
        # missing param → Query default 'all'
        r = session.get(f"{BASE_URL}/api/waitlist/count", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("categoria") == "all"
        assert isinstance(data.get("count"), int)

    def test_count_invalid_categoria_no_crash(self, session):
        # Even garbage → 200 (normalized to 'outros' or 'all'); frontend never crashes.
        r = session.get(
            f"{BASE_URL}/api/waitlist/count?categoria=$$$$", timeout=30
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True


# ---------- PODCASTS (expected 404) ----------

class TestPodcastsEndpoint:
    def test_podcasts_endpoint_state(self, session):
        """P4 backlog — frontend handles missing endpoint silently.

        We just record the status. 404 or 200 are both acceptable for THIS test;
        the contract is enforced on the frontend (no podcast tab if empty/error).
        """
        r = session.get(f"{BASE_URL}/api/podcasts?limit=3", timeout=30)
        assert r.status_code in (200, 404, 405), (
            f"Unexpected status {r.status_code} for /api/podcasts: {r.text[:200]}"
        )
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data, (list, dict))
