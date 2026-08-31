from __future__ import annotations
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from typing import Any
import jwt
import pytest
from fastapi.testclient import TestClient
from app import app
from auth_api import get_store
from storage_client import AVATAR_BUCKET, get_storage

USER_ID = "11111111-1111-4111-8111-111111111111"
OTHER_ID = "22222222-2222-4222-8222-222222222222"
SECRET = "test-only-user-signing-key-at-least-32-bytes"

class FakeStore:
    def __init__(self) -> None:
        self.tables = {
            "users": [{"id": USER_ID, "email": "owner@example.test", "first_name": "Owner", "last_name": "User"}],
            "user_settings": [{"user_id": USER_ID, "language": "en", "currency": "USD", "theme": "light"}],
            "notification_preferences": [{"user_id": USER_ID, "budget_email": True, "payment_push": True}],
            "auth_refresh_tokens": [{"id": "token-1", "user_id": USER_ID}],
            "notifications": [
                {"id": "n1", "user_id": USER_ID, "title": "Budget", "type": "budget", "is_read": False, "notification_date": "2026-08-30"},
                {"id": "n2", "user_id": USER_ID, "title": "Read", "type": "credit", "is_read": True, "notification_date": "2026-08-29"},
                {"id": "other", "user_id": OTHER_ID, "title": "Private", "type": "budget", "is_read": False, "notification_date": "2026-08-30"},
            ],
        }
    def select(self, table: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        return [deepcopy(r) for r in self.tables.get(table, []) if self._matches(r, params or {})]
    def insert(self, table: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        row = deepcopy(payload); self.tables.setdefault(table, []).append(row); return [deepcopy(row)]
    def update(self, table: str, payload: dict[str, Any], params: dict[str, str]) -> list[dict[str, Any]]:
        result = []
        for row in self.tables.get(table, []):
            if self._matches(row, params): row.update(deepcopy(payload)); result.append(deepcopy(row))
        return result
    def delete(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        result = [deepcopy(r) for r in self.tables.get(table, []) if self._matches(r, params)]
        self.tables[table] = [r for r in self.tables.get(table, []) if not self._matches(r, params)]
        return result
    @staticmethod
    def _matches(row: dict[str, Any], params: dict[str, str]) -> bool:
        for key, expr in params.items():
            if key in {"select", "order", "limit"}: continue
            op, expected = expr.split(".", 1)
            if op == "eq" and str(row.get(key)).lower() != expected.lower(): return False
        return True

class FakeStorage:
    def __init__(self) -> None:
        self.uploads: list[tuple[str, str, bytes, str]] = []
        self.deletions: list[tuple[str, list[str]]] = []
    def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> str:
        self.uploads.append((bucket, path, content, content_type))
        return f"https://example.supabase.co/storage/v1/object/public/{bucket}/{path}"
    def delete(self, bucket: str, paths: list[str]) -> None:
        self.deletions.append((bucket, paths))

def headers() -> dict[str, str]:
    token = jwt.encode({"id": USER_ID, "iat": datetime.now(UTC), "exp": datetime.now(UTC)+timedelta(hours=1)}, SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def store(monkeypatch: pytest.MonkeyPatch) -> FakeStore:
    fake = FakeStore(); storage = FakeStorage(); monkeypatch.setenv("JWT_SECRET", SECRET); app.dependency_overrides[get_store] = lambda: fake; app.dependency_overrides[get_storage] = lambda: storage
    yield fake; app.dependency_overrides.clear()

@pytest.fixture
def client(store: FakeStore) -> TestClient:
    return TestClient(app)

def test_notification_routes_require_auth(client: TestClient) -> None:
    assert client.get("/api/v2/notifications").status_code == 401
    assert client.get("/api/v2/users/profile").status_code == 401

def test_notifications_are_paginated_filtered_and_owned(client: TestClient) -> None:
    response = client.get("/api/v2/notifications?unread_only=true", headers=headers())
    assert [n["id"] for n in response.json()["data"]["notifications"]] == ["n1"]
    assert response.json()["data"]["pagination"]["total"] == 1

def test_notification_mutations_are_owned(client: TestClient, store: FakeStore) -> None:
    assert client.patch("/api/v2/notifications/other/read", headers=headers()).status_code == 404
    assert client.delete("/api/v2/notifications/other", headers=headers()).status_code == 404
    assert client.patch("/api/v2/notifications/n1/read", headers=headers()).status_code == 200
    assert client.delete("/api/v2/notifications/clear-all", headers=headers()).status_code == 204
    assert [row["id"] for row in store.tables["notifications"]] == ["other"]

def test_profile_settings_and_preferences(client: TestClient) -> None:
    assert client.get("/api/v2/users/profile", headers=headers()).json()["data"]["user"]["email"] == "owner@example.test"
    profile = client.patch("/api/v2/users/profile", headers=headers(), json={"nickname": "Me"})
    assert profile.json()["data"]["user"]["nickname"] == "Me"
    settings = client.patch("/api/v2/users/settings", headers=headers(), json={"theme": "system"})
    assert settings.json()["data"]["settings"]["theme"] == "system"
    prefs = client.patch("/api/v2/users/notification-preferences", headers=headers(), json={"budget_email": False})
    assert prefs.json()["data"]["preferences"]["budget_email"] is False

def test_invalid_or_empty_user_updates_are_rejected(client: TestClient) -> None:
    assert client.patch("/api/v2/users/profile", headers=headers(), json={}).status_code == 400
    assert client.patch("/api/v2/users/settings", headers=headers(), json={"theme": "neon"}).status_code == 422
    assert client.patch("/api/v2/users/notification-preferences", headers=headers(), json={}).status_code == 400

def test_avatar_upload_is_validated_and_persisted(client: TestClient, store: FakeStore) -> None:
    png = b"\x89PNG\r\n\x1a\n" + b"safe-image-data"
    response = client.post(
        "/api/v2/users/avatar", headers=headers(), files={"avatar": ("avatar.png", png, "image/png")}
    )
    assert response.status_code == 200
    url = response.json()["data"]["user"]["avatar_url"]
    assert f"/{AVATAR_BUCKET}/{USER_ID}/" in url
    assert store.tables["users"][0]["avatar_url"] == url
    assert client.post(
        "/api/v2/users/avatar", headers=headers(), files={"avatar": ("fake.png", b"not-an-image", "image/png")}
    ).status_code == 415

def test_delete_account_revokes_refresh_tokens(client: TestClient, store: FakeStore) -> None:
    response = client.delete("/api/v2/users", headers=headers())
    assert response.status_code == 204
    assert store.tables["users"] == []
    assert store.tables["auth_refresh_tokens"] == []
