from __future__ import annotations

import hashlib
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from typing import Any, Mapping

import bcrypt
import jwt
from fastapi.testclient import TestClient

from app import app
from auth_api import get_store


USER_ID = "11111111-1111-4111-8111-111111111111"


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [
                {
                    "id": USER_ID,
                    "email": "person@example.com",
                    "password_hash": bcrypt.hashpw(b"correct-password", bcrypt.gensalt()).decode(),
                    "first_name": "Test",
                    "last_name": "Person",
                    "password_changed_at": None,
                    "password_reset_token": None,
                    "password_reset_expires": None,
                }
            ],
            "auth_refresh_tokens": [],
            "user_settings": [],
            "notification_preferences": [],
        }

    @staticmethod
    def _matches(row: Mapping[str, Any], params: Mapping[str, str]) -> bool:
        for key, expression in params.items():
            if key in {"select", "limit", "order"}:
                continue
            if expression == "is.null":
                if row.get(key) is not None:
                    return False
            elif expression.startswith("eq."):
                if str(row.get(key, "")) != expression[3:]:
                    return False
            elif expression.startswith("gt."):
                value = row.get(key)
                if value is None or datetime.fromisoformat(str(value).replace("Z", "+00:00")) <= datetime.fromisoformat(expression[3:].replace("Z", "+00:00")):
                    return False
        return True

    def select(self, table: str, params: Mapping[str, str] | None = None) -> list[dict[str, Any]]:
        params = params or {}
        rows = [deepcopy(row) for row in self.tables.get(table, []) if self._matches(row, params)]
        limit = int(params.get("limit", len(rows)))
        return rows[:limit]

    def insert(self, table: str, payload: Mapping[str, Any]) -> list[dict[str, Any]]:
        row = dict(payload)
        if table == "users":
            row.setdefault("id", "22222222-2222-4222-8222-222222222222")
            row.setdefault("password_changed_at", None)
        else:
            row.setdefault("id", f"{len(self.tables.setdefault(table, [])) + 1}")
        self.tables.setdefault(table, []).append(row)
        return [deepcopy(row)]

    def update(self, table: str, payload: Mapping[str, Any], params: Mapping[str, str]) -> list[dict[str, Any]]:
        updated = []
        for row in self.tables.get(table, []):
            if self._matches(row, params):
                row.update(payload)
                updated.append(deepcopy(row))
        return updated

    def delete(self, table: str, params: Mapping[str, str]) -> list[dict[str, Any]]:
        removed = [row for row in self.tables.get(table, []) if self._matches(row, params)]
        self.tables[table] = [row for row in self.tables.get(table, []) if not self._matches(row, params)]
        return deepcopy(removed)


def make_client(monkeypatch: Any) -> tuple[TestClient, FakeStore]:
    monkeypatch.setenv("JWT_SECRET", "access-test-secret-with-enough-entropy")
    monkeypatch.setenv("JWT_REFRESH_SECRET", "refresh-test-secret-with-enough-entropy")
    store = FakeStore()
    app.dependency_overrides[get_store] = lambda: store
    return TestClient(app), store


def test_login_rejects_wrong_password(monkeypatch: Any) -> None:
    client, _ = make_client(monkeypatch)
    response = client.post("/auth/login", json={"email": "person@example.com", "password": "wrong"})
    assert response.status_code == 401


def test_login_issues_compatible_tokens_and_http_only_cookies(monkeypatch: Any) -> None:
    client, store = make_client(monkeypatch)
    response = client.post("/api/v2/auth/login", json={"email": "person@example.com", "password": "correct-password"})
    assert response.status_code == 200
    assert response.json()["data"]["user"]["id"] == USER_ID
    assert response.json()["token"]
    assert response.json()["refreshToken"]
    assert "HttpOnly" in response.headers.get("set-cookie", "")
    assert len(store.tables["auth_refresh_tokens"]) == 1


def test_me_requires_and_accepts_access_token(monkeypatch: Any) -> None:
    client, _ = make_client(monkeypatch)
    assert client.get("/auth/me").status_code == 401
    login = client.post("/auth/login", json={"email": "person@example.com", "password": "correct-password"})
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {login.json()['token']}"})
    assert response.status_code == 200
    assert response.json()["data"]["user"]["email"] == "person@example.com"


def test_existing_express_access_tokens_remain_compatible(monkeypatch: Any) -> None:
    client, _ = make_client(monkeypatch)
    legacy = jwt.encode(
        {"id": USER_ID, "iat": datetime.now(UTC), "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "access-test-secret-with-enough-entropy",
        algorithm="HS256",
    )
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {legacy}"})
    assert response.status_code == 200


def test_refresh_rotates_and_revokes_previous_token(monkeypatch: Any) -> None:
    client, store = make_client(monkeypatch)
    login = client.post("/auth/login", json={"email": "person@example.com", "password": "correct-password"})
    old_refresh = login.json()["refreshToken"]
    response = client.post("/auth/refresh-token", headers={"Authorization": f"Bearer {old_refresh}"})
    assert response.status_code == 200
    assert response.json()["refreshToken"] != old_refresh
    assert store.tables["auth_refresh_tokens"][0]["revoked_at"] is not None
    replay = client.post("/auth/refresh-token", headers={"Authorization": f"Bearer {old_refresh}"})
    assert replay.status_code == 401


def test_logout_revokes_refresh_cookie_even_with_access_header(monkeypatch: Any) -> None:
    client, store = make_client(monkeypatch)
    login = client.post("/api/v2/auth/login", json={"email": "person@example.com", "password": "correct-password"})
    response = client.post(
        "/api/v2/auth/logout",
        headers={"Authorization": f"Bearer {login.json()['token']}"},
    )
    assert response.status_code == 200
    assert store.tables["auth_refresh_tokens"] == []


def test_register_creates_defaults_and_never_returns_password(monkeypatch: Any) -> None:
    client, store = make_client(monkeypatch)
    response = client.post(
        "/auth/register",
        json={
            "email": "new@example.com",
            "password": "a-secure-password",
            "password_confirm": "a-secure-password",
            "first_name": "New",
            "last_name": "User",
        },
    )
    assert response.status_code == 201
    assert "password_hash" not in response.text
    assert len(store.tables["user_settings"]) == 1
    assert len(store.tables["notification_preferences"]) == 1


def test_password_update_revokes_sessions_and_issues_new_session(monkeypatch: Any) -> None:
    client, store = make_client(monkeypatch)
    login = client.post("/auth/login", json={"email": "person@example.com", "password": "correct-password"})
    response = client.patch(
        "/auth/update-password",
        headers={"Authorization": f"Bearer {login.json()['token']}"},
        json={"current_password": "correct-password", "new_password": "new-secure-password", "new_password_confirm": "new-secure-password"},
    )
    assert response.status_code == 200
    assert all(token.get("revoked_at") is not None for token in store.tables["auth_refresh_tokens"][:-1])
    assert bcrypt.checkpw(b"new-secure-password", store.tables["users"][0]["password_hash"].encode())


def test_reset_password_consumes_hashed_token(monkeypatch: Any) -> None:
    client, store = make_client(monkeypatch)
    raw = "one-time-reset-token"
    store.tables["users"][0]["password_reset_token"] = hashlib.sha256(raw.encode()).hexdigest()
    store.tables["users"][0]["password_reset_expires"] = (datetime.now(UTC) + timedelta(minutes=5)).isoformat()
    response = client.patch(
        f"/auth/reset-password/{raw}",
        json={"password": "reset-secure-password", "password_confirm": "reset-secure-password"},
    )
    assert response.status_code == 200
    assert store.tables["users"][0]["password_reset_token"] is None
    assert bcrypt.checkpw(b"reset-secure-password", store.tables["users"][0]["password_hash"].encode())


def test_forgot_password_is_non_enumerating(monkeypatch: Any) -> None:
    client, _ = make_client(monkeypatch)
    known = client.post("/auth/forgot-password", json={"email": "person@example.com"})
    unknown = client.post("/auth/forgot-password", json={"email": "missing@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
