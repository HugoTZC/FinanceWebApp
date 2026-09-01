from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

from app import app
from auth_api import get_store


USER_ID = "11111111-1111-4111-8111-111111111111"
OTHER_USER_ID = "22222222-2222-4222-8222-222222222222"
JWT_SECRET = "test-only-financial-core-signing-key"


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "bank_accounts": [
                {"id": "account-1", "user_id": USER_ID, "name": "Principal", "account_type": "debit", "balance": 1000, "is_default": True},
                {"id": "account-other", "user_id": OTHER_USER_ID, "name": "Ajena", "account_type": "debit", "balance": 9000, "is_default": True},
            ],
            "categories": [
                {"id": "default-income", "name": "Salario", "type": "income", "is_default": True},
                {"id": "default-expense", "name": "Alimentos", "type": "expense", "is_default": True},
                {"id": "not-default", "name": "Interna", "type": "expense", "is_default": False},
            ],
            "user_categories": [
                {"id": "category-1", "user_id": USER_ID, "name": "Mascotas", "type": "expense"},
                {"id": "category-other", "user_id": OTHER_USER_ID, "name": "Ajena", "type": "expense"},
            ],
            "user_default_category_preferences": [],
            "transactions": [
                {"id": "transaction-1", "user_id": USER_ID, "bank_account_id": "account-1", "amount": 100, "type": "income", "transaction_date": datetime.now(UTC).date().isoformat()},
                {"id": "transaction-other", "user_id": OTHER_USER_ID, "bank_account_id": "account-1", "amount": 9999, "type": "expense", "transaction_date": datetime.now(UTC).date().isoformat()},
            ],
        }
        self.operations: list[tuple[str, str, dict[str, Any]]] = []

    def select(self, table: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        params = params or {}
        rows = [deepcopy(row) for row in self.tables.get(table, []) if self._matches(row, params)]
        if "limit" in params:
            rows = rows[: int(params["limit"])]
        return rows

    def insert(self, table: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        row = deepcopy(payload) | {"id": f"{table}-new"}
        self.tables.setdefault(table, []).append(row)
        self.operations.append(("insert", table, deepcopy(row)))
        return [deepcopy(row)]

    def update(self, table: str, payload: dict[str, Any], params: dict[str, str]) -> list[dict[str, Any]]:
        rows = []
        for row in self.tables.get(table, []):
            if self._matches(row, params):
                row.update(deepcopy(payload))
                rows.append(deepcopy(row))
        self.operations.append(("update", table, deepcopy(params)))
        return rows

    def delete(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        rows = [deepcopy(row) for row in self.tables.get(table, []) if self._matches(row, params)]
        self.tables[table] = [row for row in self.tables.get(table, []) if not self._matches(row, params)]
        self.operations.append(("delete", table, deepcopy(params)))
        return rows

    @staticmethod
    def _matches(row: dict[str, Any], params: dict[str, str]) -> bool:
        for field, expression in params.items():
            if field in {"select", "order", "limit"}:
                continue
            operator, expected = expression.split(".", 1)
            actual = str(row.get(field)).lower()
            if operator == "eq" and actual != expected.lower():
                return False
            if operator == "neq" and actual == expected.lower():
                return False
        return True


def _headers() -> dict[str, str]:
    token = jwt.encode(
        {"id": USER_ID, "iat": datetime.now(UTC), "exp": datetime.now(UTC) + timedelta(hours=1)},
        JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def store(monkeypatch: pytest.MonkeyPatch) -> FakeStore:
    fake = FakeStore()
    monkeypatch.setenv("JWT_SECRET", JWT_SECRET)
    app.dependency_overrides[get_store] = lambda: fake
    yield fake
    app.dependency_overrides.clear()


@pytest.fixture
def client(store: FakeStore) -> TestClient:
    del store
    return TestClient(app)


def test_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v2/accounts").status_code == 401
    assert client.get("/api/v2/categories").status_code == 401


def test_account_crud_is_scoped_to_authenticated_owner(client: TestClient, store: FakeStore) -> None:
    response = client.get("/api/v2/accounts", headers=_headers())
    assert [row["id"] for row in response.json()["data"]["accounts"]] == ["account-1"]
    created = client.post("/api/v2/accounts", headers=_headers(), json={"name": "Ahorro", "account_type": "savings", "balance": 500})
    assert created.status_code == 201
    assert created.json()["data"]["account"]["user_id"] == USER_ID
    updated = client.patch("/api/v2/accounts/account-1", headers=_headers(), json={"balance": 1250})
    assert updated.status_code == 200
    assert updated.json()["data"]["account"]["balance"] == 1250
    assert client.get("/api/v2/accounts/account-other", headers=_headers()).status_code == 404
    assert client.delete("/api/v2/accounts/account-other", headers=_headers()).status_code == 404
    assert any(op[2].get("user_id") == f"eq.{USER_ID}" for op in store.operations if op[0] == "update")


def test_setting_default_account_unsets_only_other_owned_accounts(client: TestClient, store: FakeStore) -> None:
    response = client.post("/api/v2/accounts", headers=_headers(), json={"name": "Nueva principal", "account_type": "checking", "is_default": True})
    assert response.status_code == 201
    assert store.tables["bank_accounts"][0]["is_default"] is False
    assert store.tables["bank_accounts"][1]["is_default"] is True


def test_account_history_excludes_other_users_transactions(client: TestClient) -> None:
    response = client.get("/api/v2/accounts/account-1/history", headers=_headers(), params={"months": 1})
    assert response.status_code == 200
    assert response.json()["data"]["history"][0]["net_change"] == 100


def test_categories_preserve_express_contract_and_ownership(client: TestClient) -> None:
    combined = client.get("/api/v2/categories", headers=_headers()).json()["data"]["categories"]
    assert [row["name"] for row in combined] == ["Alimentos", "Mascotas", "Salario"]
    assert {row["source"] for row in combined} == {"default", "user"}
    typed = client.get("/api/v2/categories/type/expense", headers=_headers())
    assert [row["name"] for row in typed.json()["data"]["categories"]] == ["Alimentos", "Mascotas"]
    created = client.post("/api/v2/categories", headers=_headers(), json={"name": "Viajes", "type": "expense"})
    assert created.status_code == 201
    assert created.json()["data"]["category"]["user_id"] == USER_ID
    legacy_created = client.post("/api/v2/categories/user", headers=_headers(), json={"name": "Casa", "type": "expense"})
    assert legacy_created.status_code == 201
    assert legacy_created.json()["data"]["category"]["user_id"] == USER_ID
    assert client.get("/api/v2/categories/user/category-other", headers=_headers()).status_code == 404
    assert client.patch("/api/v2/categories/user/category-other", headers=_headers(), json={"name": "Cambio"}).status_code == 404
    assert client.delete("/api/v2/categories/user/category-other", headers=_headers()).status_code == 404


def test_default_category_only_allows_owner_scoped_color_override(client: TestClient, store: FakeStore) -> None:
    response = client.patch(
        "/api/v2/categories/default-expense",
        headers=_headers(),
        json={"color": "#123ABC"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["category"]["color"] == "#123ABC"
    combined = client.get("/api/v2/categories", headers=_headers()).json()["data"]["categories"]
    assert next(row for row in combined if row["id"] == "default-expense")["color"] == "#123ABC"
    assert client.patch(
        "/api/v2/categories/default-expense",
        headers=_headers(),
        json={"name": "Not allowed", "color": "#FFFFFF"},
    ).status_code == 422
    assert store.tables["categories"][1]["name"] == "Alimentos"


def test_invalid_or_empty_payloads_are_rejected(client: TestClient) -> None:
    assert client.post("/api/v2/categories", headers=_headers(), json={"name": "Inválida", "type": "other"}).status_code == 422
    assert client.patch("/api/v2/accounts/account-1", headers=_headers(), json={}).status_code == 400
    assert client.get("/api/v2/accounts/account-1/history", headers=_headers(), params={"months": 25}).status_code == 422
