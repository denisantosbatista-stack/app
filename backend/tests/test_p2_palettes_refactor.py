"""Regression suite for P2 Backend Modularization Phase 2 — Step 2.

Confirma que após extrair /api/palettes/* e /api/dna/share* de server.py para
routers/palettes.py (com prefix=/api, tags=palettes):

1. Todos os endpoints continuam funcionais (CRUD palettes + DNA share).
2. Validações (400, 404, 413) preservadas.
3. Não há rotas duplicadas em app.routes para os paths refatorados.
4. Rotas adjacentes (root /api/, /api/download/source, AI, demais routers)
   continuam respondendo (regressão cruzada).

Roda contra REACT_APP_BACKEND_URL (lido de frontend/.env).
"""
from __future__ import annotations

import os
import sys
import json
import time
from pathlib import Path

import pytest
import requests


# ----- Resolve BASE_URL a partir de frontend/.env (sem default) -----
def _resolve_base_url() -> str:
    env_url = os.environ.get("REACT_APP_BACKEND_URL")
    if env_url:
        return env_url.rstrip("/")
    fe_env = Path("/app/frontend/.env")
    if fe_env.exists():
        for line in fe_env.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    pytest.skip("REACT_APP_BACKEND_URL não definido")


BASE_URL = _resolve_base_url()
API = f"{BASE_URL}/api"
# OpenAPI só é servido pelo backend internamente (não roteado pelo ingress que
# encaminha apenas /api/*); usamos localhost:8001 para introspecção.
LOCAL_BACKEND = "http://localhost:8001"


# ============================================================
# Smoke: rotas básicas e ausência de duplicatas
# ============================================================
class TestSmoke:
    def test_root_alive(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "message" in data

    def test_openapi_no_duplicates(self):
        """Cada path refatorado deve aparecer UMA única vez no OpenAPI."""
        r = requests.get(f"{LOCAL_BACKEND}/openapi.json", timeout=15)
        assert r.status_code == 200
        spec = r.json()
        paths = spec.get("paths", {})
        # Os paths esperados (chaves únicas no dict OpenAPI já garantem 1x;
        # esta asserção confirma que cada um existe E tem o método correto)
        assert "/api/palettes" in paths
        assert "get" in paths["/api/palettes"]
        assert "post" in paths["/api/palettes"]
        assert "/api/palettes/{palette_id}" in paths
        assert "patch" in paths["/api/palettes/{palette_id}"]
        assert "delete" in paths["/api/palettes/{palette_id}"]
        assert "/api/dna/share" in paths
        assert "post" in paths["/api/dna/share"]
        assert "/api/dna/share/{share_id}" in paths
        assert "get" in paths["/api/dna/share/{share_id}"]

    def test_openapi_other_routers_registered(self):
        """Confirma que demais routers continuam registrados."""
        r = requests.get(f"{LOCAL_BACKEND}/openapi.json", timeout=15)
        spec = r.json()
        paths = spec.get("paths", {})
        # Amostra de cada router crítico
        expected_substrings = [
            "/api/auth/",
            "/api/feed",
            "/api/marketplace",
            "/api/profile",
            "/api/challenges",
            "/api/og",
            "/api/ai/",
            "/api/download/source",
        ]
        joined = "\n".join(paths.keys())
        missing = [s for s in expected_substrings if s not in joined]
        assert not missing, f"Routers ausentes no OpenAPI: {missing}"

    def test_in_process_no_duplicate_routes(self):
        """Carrega o app in-process e verifica que cada path/method aparece 1x."""
        sys.path.insert(0, "/app/backend")
        try:
            from server import app  # type: ignore  # noqa: WPS433
        except Exception as e:  # pragma: no cover
            pytest.skip(f"Não foi possível importar server in-process: {e}")
        seen = {}
        for route in app.routes:
            path = getattr(route, "path", None)
            methods = getattr(route, "methods", None) or set()
            if not path:
                continue
            for m in methods:
                if m in {"HEAD", "OPTIONS"}:
                    continue
                key = (m, path)
                seen[key] = seen.get(key, 0) + 1
        duplicates = {k: v for k, v in seen.items() if v > 1}
        # Foco nos paths refatorados
        refactored = {
            ("GET", "/api/palettes"),
            ("POST", "/api/palettes"),
            ("PATCH", "/api/palettes/{palette_id}"),
            ("DELETE", "/api/palettes/{palette_id}"),
            ("POST", "/api/dna/share"),
            ("GET", "/api/dna/share/{share_id}"),
        }
        refactored_dups = {k: v for k, v in duplicates.items() if k in refactored}
        assert not refactored_dups, f"Rotas duplicadas: {refactored_dups}"
        # Verifica que os 6 paths estão registrados
        for key in refactored:
            assert key in seen, f"Rota não registrada: {key}"


# ============================================================
# Palettes CRUD
# ============================================================
class TestPalettesCRUD:
    created_ids: list[str] = []

    @classmethod
    def teardown_class(cls):
        """Cleanup: remove paletas TEST_ criadas."""
        for pid in cls.created_ids:
            try:
                requests.delete(f"{API}/palettes/{pid}", timeout=10)
            except Exception:
                pass

    def test_list_palettes(self):
        r = requests.get(f"{API}/palettes", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)

    def test_list_palettes_filter_favorite(self):
        r = requests.get(f"{API}/palettes?favorite=true", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for p in data:
            assert p["favorite"] is True

    def test_create_palette(self):
        payload = {
            "name": "TEST_p2_palette",
            "description": "criada pelo regression test",
            "colors": [
                {"hex": "#112233", "name": "Azul Noite", "role": "principal"},
                {"hex": "#aabbcc", "name": "Pedra Clara", "role": "acento"},
            ],
            "style": "classic",
            "tags": ["TEST", "regression"],
            "favorite": False,
            "source": "user",
        }
        r = requests.post(f"{API}/palettes", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str)
        assert data["name"] == payload["name"]
        assert len(data["colors"]) == 2
        assert data["colors"][0]["hex"] == "#112233"
        assert data["tags"] == ["TEST", "regression"]
        assert data["favorite"] is False
        assert "created_at" in data
        type(self).created_ids.append(data["id"])

    def test_patch_palette_name_favorite_tags(self):
        assert self.created_ids, "test_create_palette precisa ter rodado antes"
        pid = self.created_ids[0]
        upd = {"name": "TEST_p2_palette_renamed", "favorite": True, "tags": ["renomeada"]}
        r = requests.patch(f"{API}/palettes/{pid}", json=upd, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == pid
        assert data["name"] == "TEST_p2_palette_renamed"
        assert data["favorite"] is True
        assert data["tags"] == ["renomeada"]
        # Confirma persistência via list+filter favorite
        r2 = requests.get(f"{API}/palettes?favorite=true", timeout=15)
        ids = [p["id"] for p in r2.json()]
        assert pid in ids

    def test_patch_palette_empty_400(self):
        assert self.created_ids
        pid = self.created_ids[0]
        r = requests.patch(f"{API}/palettes/{pid}", json={}, timeout=15)
        assert r.status_code == 400, r.text

    def test_patch_palette_not_found_404(self):
        r = requests.patch(
            f"{API}/palettes/nonexistent_xyz_999",
            json={"name": "x"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_delete_palette(self):
        # Cria uma nova só pra deletar
        payload = {
            "name": "TEST_p2_palette_to_delete",
            "colors": [{"hex": "#000000", "name": "Preto", "role": "principal"}],
        }
        r = requests.post(f"{API}/palettes", json=payload, timeout=15)
        assert r.status_code == 200
        pid = r.json()["id"]

        rd = requests.delete(f"{API}/palettes/{pid}", timeout=15)
        assert rd.status_code == 200
        body = rd.json()
        assert body == {"deleted": True, "id": pid}

    def test_delete_palette_not_found_404(self):
        r = requests.delete(f"{API}/palettes/nonexistent_xyz_999", timeout=15)
        assert r.status_code == 404


# ============================================================
# DNA Share
# ============================================================
class TestDNAShare:
    share_id: str | None = None

    def test_create_dna_share_basic(self):
        payload = {
            "payload": {
                "name": "TEST_p2_dna",
                "palette": ["#112233", "#aabbcc"],
                "mood": "noir",
            },
            "handle": "@TEST_User.Refactor!!",  # deve normalizar
        }
        r = requests.post(f"{API}/dna/share", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str)
        assert data.get("path", "").startswith("/dna/")
        type(self).share_id = data["id"]

    def test_get_dna_share(self):
        assert self.share_id, "create deve rodar antes"
        r = requests.get(f"{API}/dna/share/{self.share_id}", timeout=15)
        assert r.status_code == 200
        doc = r.json()
        assert doc["id"] == self.share_id
        assert doc["payload"]["name"] == "TEST_p2_dna"
        assert "created_at" in doc
        # Normalização de handle: @TEST_User.Refactor!! ->
        # remove @, lower, mantém [a-z0-9._-], removendo '!!' e '_' não é removido
        # (pertence ao set permitido). Resultado esperado:
        # "test_user.refactor"
        assert doc["handle"] == "test_user.refactor", f"handle={doc['handle']}"
        # confirma que _id do Mongo não vazou
        assert "_id" not in doc

    def test_create_dna_share_empty_400(self):
        r = requests.post(f"{API}/dna/share", json={"payload": {}}, timeout=15)
        assert r.status_code == 400

    def test_create_dna_share_too_large_413(self):
        # ~70KB de string
        big = {"blob": "x" * (70 * 1024)}
        r = requests.post(f"{API}/dna/share", json={"payload": big}, timeout=15)
        assert r.status_code == 413, r.text

    def test_get_dna_share_not_found_404(self):
        r = requests.get(f"{API}/dna/share/notfound_abc123", timeout=15)
        assert r.status_code == 404

    def test_handle_normalization_truncation(self):
        """Handle > 32 chars deve ser truncado em 32 (novo padrão _shared)."""
        long_handle = "a" * 50
        r = requests.post(
            f"{API}/dna/share",
            json={"payload": {"k": "v"}, "handle": long_handle},
            timeout=15,
        )
        assert r.status_code == 200
        share_id = r.json()["id"]
        rg = requests.get(f"{API}/dna/share/{share_id}", timeout=15)
        assert rg.status_code == 200
        assert len(rg.json()["handle"]) == 32


# ============================================================
# Regressões cruzadas
# ============================================================
class TestCrossRegressions:
    def test_root_still_works(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200

    def test_download_source_zip(self):
        """Endpoint de download de source deve continuar gerando ZIP."""
        r = requests.get(f"{API}/download/source", timeout=60, stream=True)
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "zip" in ctype.lower(), f"content-type={ctype}"
        # Lê um pouco do corpo pra confirmar que é um zip (magic PK)
        chunk = next(r.iter_content(8), b"")
        assert chunk[:2] == b"PK", f"não parece ZIP: {chunk[:4]!r}"

    def test_ai_luxury_score_sanity(self):
        """Regressão AI: rota /api/ai/luxury-score continua viva."""
        payload = {
            "palette_name": "TEST_quick",
            "colors": ["#111111", "#cccccc", "#888888"],
            "description": "regressão rápida",
            "style": "classic",
        }
        r = requests.post(f"{API}/ai/luxury-score", json=payload, timeout=120)
        # 200 esperado; aceitamos 502/504 só se LLM externo cair, mas o sintoma
        # de quebra de refactor seria 404.
        assert r.status_code != 404, "rota AI sumiu após refactor!"
        assert r.status_code in (200, 502, 503, 504), r.text
        if r.status_code == 200:
            data = r.json()
            # Schema mínimo do luxury-score
            assert "score" in data or "luxury_score" in data or "parecer" in data
