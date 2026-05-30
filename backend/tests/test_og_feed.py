"""Backend tests for OG feed routes: HTML + SVG, real & non-existent IDs."""
import os
import re
import pytest
import requests
from pathlib import Path


def _load_backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if url:
        return url.rstrip("/")
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")


BASE_URL = _load_backend_url()
REAL_POST_ID = "8bc927129698"
FAKE_POST_ID = "this-post-does-not-exist-zzz"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


# OG Feed HTML (real post)
class TestFeedOgHtmlRealPost:
    def test_status_200(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{REAL_POST_ID}", timeout=15)
        assert r.status_code == 200, r.text[:300]
        assert "text/html" in r.headers.get("content-type", "").lower()

    def test_html_has_og_tags(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{REAL_POST_ID}", timeout=15)
        html = r.text
        assert re.search(r'property=["\']og:title["\']', html), "missing og:title"
        assert re.search(r'property=["\']og:description["\']', html), "missing og:description"
        assert re.search(r'property=["\']og:image["\']', html), "missing og:image"
        assert re.search(r'property=["\']og:url["\']', html), "missing og:url"
        # og:locale pt_BR
        assert re.search(r'property=["\']og:locale["\'][^>]+pt_BR', html), "missing og:locale pt_BR"

    def test_og_image_absolute_to_same_post_svg(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{REAL_POST_ID}", timeout=15)
        m = re.search(
            r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', r.text
        )
        assert m, "og:image not found"
        og_image = m.group(1)
        assert og_image.startswith(("http://", "https://")), f"og:image not absolute: {og_image}"
        assert f"/api/og/feed/{REAL_POST_ID}/image.svg" in og_image

    def test_og_url_points_to_feed_post_anchor(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{REAL_POST_ID}", timeout=15)
        m = re.search(r'property=["\']og:url["\']\s+content=["\']([^"\']+)["\']', r.text)
        assert m, "og:url not found"
        og_url = m.group(1)
        assert f"/feed#post-{REAL_POST_ID}" in og_url, f"og:url wrong: {og_url}"
        assert og_url.startswith(("http://", "https://")), "og:url not absolute"


# OG Feed HTML (non-existent post)
class TestFeedOgHtmlNotFound:
    def test_status_404_html(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{FAKE_POST_ID}", timeout=15)
        assert r.status_code == 404
        assert "text/html" in r.headers.get("content-type", "").lower()
        html = r.text
        assert re.search(r'property=["\']og:title["\']', html), "fallback missing og:title"
        assert re.search(r'property=["\']og:description["\']', html), "fallback missing og:description"
        assert re.search(r'property=["\']og:url["\']', html), "fallback missing og:url"


# OG Feed SVG (real post)
class TestFeedOgSvgRealPost:
    def test_status_200_and_content_type(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{REAL_POST_ID}/image.svg", timeout=15)
        assert r.status_code == 200
        assert "image/svg+xml" in r.headers.get("content-type", "").lower()

    def test_svg_well_formed(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{REAL_POST_ID}/image.svg", timeout=15)
        body = r.text
        assert "<svg" in body and "</svg>" in body
        assert "xmlns=\"http://www.w3.org/2000/svg\"" in body
        assert "viewBox=\"0 0 1200 630\"" in body


# OG Feed SVG (non-existent post) — should NOT crash; returns 200 default
class TestFeedOgSvgFallback:
    def test_status_200_default_palette(self, session):
        r = session.get(f"{BASE_URL}/api/og/feed/{FAKE_POST_ID}/image.svg", timeout=15)
        assert r.status_code == 200, r.text[:300]
        assert "image/svg+xml" in r.headers.get("content-type", "").lower()
        assert "<svg" in r.text and "</svg>" in r.text
