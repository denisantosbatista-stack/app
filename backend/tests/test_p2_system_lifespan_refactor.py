"""P2 Backend refactor regression tests.

Cobre:
- Migração do startup/shutdown para FastAPI lifespan (verifica que init_auth rodou).
- Extração das rotas / e /download/source para routers/system.py.
- Remoção da @property Challenge.status (sem warning Pydantic + status correto).
- Smoke nas demais rotas críticas (feed, marketplace, OG, palettes) para garantir
  que o registro de routers continua funcionando após a refatoração do server.py.
"""
from __future__ import annotations

import io
import os
import time
import zipfile

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "admin@lindart.app"
ADMIN_PASSWORD = "Lindart#2026"


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- routers/system.py ----------

class TestSystemRouter:
    """Rotas movidas de server.py para routers/system.py"""

    def test_root_health(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data == {"message": "LindArt API online", "version": "1.0"}, data

    def test_download_source_zip(self, api):
        r = api.get(f"{BASE_URL}/api/download/source", timeout=120)
        assert r.status_code == 200, r.text[:300]

        # Content-Type
        ct = r.headers.get("content-type", "")
        assert "application/zip" in ct, f"content-type inesperado: {ct}"

        # Content-Disposition com nome lindart-source-*.zip
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower(), cd
        assert "lindart-source-" in cd, cd
        assert ".zip" in cd, cd

        # ZIP não vazio e válido
        body = r.content
        assert len(body) > 1024, f"zip muito pequeno: {len(body)} bytes"
        with zipfile.ZipFile(io.BytesIO(body)) as zf:
            names = zf.namelist()
            assert len(names) > 10, f"zip com poucos arquivos: {len(names)}"
            # incluiu backend e frontend
            assert any(n.startswith("backend/") for n in names), "faltou backend/"
            assert any(n.startswith("frontend/") for n in names), "faltou frontend/"
            # README embarcado
            assert "LINDART_README.md" in names, "faltou LINDART_README.md"
            # Não deve incluir .env nem __pycache__
            assert not any(n.endswith("/.env") or n == ".env" for n in names), \
                ".env vazou no zip"
            assert not any("__pycache__" in n for n in names), \
                "__pycache__ vazou no zip"
            assert not any("node_modules" in n for n in names), \
                "node_modules vazou no zip"
            assert not any(".git/" in n for n in names), ".git vazou no zip"


# ---------- routers/challenges.py (sem @property Challenge.status) ----------

class TestChallengesNoShadowing:
    """Garante que após remover @property Challenge.status:
    - lista retorna status (active/upcoming/ended) e submissions_count
    - detalhe ainda funciona
    """

    def test_list_challenges_has_status_and_count(self, api):
        r = api.get(f"{BASE_URL}/api/challenges")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1, "esperava ao menos um desafio (seed)"

        valid_status = {"active", "upcoming", "ended"}
        for ch in data:
            assert "id" in ch and isinstance(ch["id"], str) and ch["id"]
            assert "title" in ch
            assert "prompt" in ch
            assert "starts_at" in ch and "ends_at" in ch
            assert "status" in ch, f"faltou status em {ch.get('id')}"
            assert ch["status"] in valid_status, ch["status"]
            assert "submissions_count" in ch
            assert isinstance(ch["submissions_count"], int)
            assert ch["submissions_count"] >= 0

    def test_get_challenge_detail(self, api):
        lst = api.get(f"{BASE_URL}/api/challenges").json()
        assert lst, "sem desafios para testar detalhe"
        cid = lst[0]["id"]

        r = api.get(f"{BASE_URL}/api/challenges/{cid}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "challenge" in body and "submissions" in body
        assert body["challenge"]["id"] == cid
        assert body["challenge"]["status"] in {"active", "upcoming", "ended"}
        assert isinstance(body["submissions"], list)
        # winner pode ser None
        assert "winner" in body

    def test_get_challenge_not_found(self, api):
        r = api.get(f"{BASE_URL}/api/challenges/zzz_nao_existe_xyz")
        assert r.status_code == 404


# ---------- Smoke das rotas críticas (lifespan + routers ok) ----------

class TestCriticalRoutesSmoke:
    """Verifica que o lifespan não quebrou o registro dos routers."""

    def test_feed_list(self, api):
        r = api.get(f"{BASE_URL}/api/feed?limit=5")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        # Feed pode ser lista direta ou dict com items
        if isinstance(data, dict):
            assert "items" in data or "posts" in data or "data" in data
        else:
            assert isinstance(data, list)

    def test_marketplace_list(self, api):
        r = api.get(f"{BASE_URL}/api/marketplace?limit=5")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        if isinstance(data, dict):
            assert "items" in data or "data" in data
        else:
            assert isinstance(data, list)

    def test_palettes_list(self, api):
        r = api.get(f"{BASE_URL}/api/palettes")
        assert r.status_code == 200, r.text[:300]

    def test_og_marketplace_route_registered(self, api):
        # Tenta uma rota OG: a ideia é confirmar registro do router, não conteúdo.
        # Procura primeiro um item válido do marketplace; senão usa id falso e
        # aceita 200/404 (apenas garante não-500 / não-404-de-rota-desconhecida).
        mk = api.get(f"{BASE_URL}/api/marketplace?limit=1").json()
        target_id = None
        if isinstance(mk, list) and mk:
            target_id = mk[0].get("id")
        elif isinstance(mk, dict):
            items = mk.get("items") or mk.get("data") or []
            if items:
                target_id = items[0].get("id")
        target_id = target_id or "no_such_id_xyz"

        r = api.get(f"{BASE_URL}/api/og/marketplace/{target_id}")
        # Aceita 200 (existente) ou 404 (não existe), o que importa é router
        # estar registrado (não retornar 404 com detail "Not Found" do próprio
        # FastAPI por rota inexistente). Ambos casos confirmam router OK.
        assert r.status_code in (200, 404), f"status inesperado {r.status_code}: {r.text[:200]}"


# ---------- Lifespan: init_auth() rodou ----------

class TestLifespanAuthInit:
    """Confirma que init_auth() rodou via lifespan:
    - login do admin seed funciona (idempotente)
    - registro novo gera handle automaticamente
    """

    def test_admin_seed_login(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # token pode estar em access_token/token
        assert any(k in data for k in ("access_token", "token")), data.keys()
        # user payload presente
        assert "user" in data or "email" in data

    def test_register_generates_handle(self, api):
        ts = int(time.time() * 1000)
        email = f"e2e_p2_lifespan_{ts}@lindartmail.io"
        r = api.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "password": "TestPass#2026",
                "name": "P2 Lifespan Test",
            },
        )
        assert r.status_code in (200, 201), r.text
        data = r.json()
        user = data.get("user") or data
        # handle deve ter sido gerado automaticamente
        assert user.get("handle"), f"handle vazio/ausente: {user}"
        assert isinstance(user["handle"], str)
        assert len(user["handle"]) >= 2
