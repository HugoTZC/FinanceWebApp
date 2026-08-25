from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

from app import app
from mvp_api import get_store
from supabase_client import SupabaseRestClient


USER_ID = "11111111-1111-4111-8111-111111111111"
OTHER_USER_ID = "22222222-2222-4222-8222-222222222222"
TEST_SIGNING_KEY = "test-only-signing-key-with-enough-entropy"


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [
                {
                    "id": USER_ID,
                    "email": "owner@example.test",
                    "first_name": "Owner",
                    "last_name": "Test",
                }
            ],
            "bank_accounts": [
                {
                    "id": "account-1",
                    "user_id": USER_ID,
                    "name": "Cuenta principal",
                    "account_type": "debit",
                    "balance": 1000,
                    "is_default": True,
                },
                {
                    "id": "account-other",
                    "user_id": OTHER_USER_ID,
                    "name": "No visible",
                    "account_type": "debit",
                    "balance": 999,
                    "is_default": True,
                },
            ],
            "categories": [
                {
                    "id": "category-income",
                    "name": "Salario",
                    "type": "income",
                    "is_default": True,
                },
                {
                    "id": "category-food",
                    "name": "Alimentos",
                    "type": "expense",
                    "is_default": True,
                },
            ],
            "user_categories": [
                {
                    "id": "user-category-1",
                    "user_id": USER_ID,
                    "name": "Mascotas",
                    "type": "expense",
                }
            ],
            "credit_cards": [
                {
                    "id": "card-1",
                    "user_id": USER_ID,
                    "name": "Tarjeta principal",
                    "balance": 2500,
                    "credit_limit": 10000,
                }
            ],
            "transactions": [
                {
                    "id": "tx-1",
                    "user_id": USER_ID,
                    "title": "Supermercado",
                    "amount": 500,
                    "transaction_date": "2026-08-20",
                    "type": "expense",
                    "category_id": "category-food",
                    "user_category_id": None,
                    "payment_method": "credit_card",
                    "bank_account_id": None,
                    "credit_card_id": "card-1",
                },
                {
                    "id": "tx-2",
                    "user_id": USER_ID,
                    "title": "Nómina",
                    "amount": 3000,
                    "transaction_date": "2026-08-15",
                    "type": "income",
                    "category_id": "category-income",
                    "user_category_id": None,
                    "payment_method": "cash",
                    "bank_account_id": None,
                    "credit_card_id": None,
                },
            ],
        }
        self.operations: list[tuple[str, str, dict[str, Any]]] = []

    def select(
        self, table: str, params: dict[str, str] | None = None
    ) -> list[dict[str, Any]]:
        params = params or {}
        rows = deepcopy(self.tables.get(table, []))
        rows = [row for row in rows if self._matches(row, params)]
        limit = int(params.get("limit", len(rows) or 1))
        return rows[:limit]

    def insert(self, table: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        row = deepcopy(payload)
        row.setdefault("id", f"{table}-{len(self.tables.get(table, [])) + 1}")
        self.tables.setdefault(table, []).append(row)
        self.operations.append(("insert", table, deepcopy(row)))
        return [deepcopy(row)]

    def update(
        self, table: str, payload: dict[str, Any], params: dict[str, str]
    ) -> list[dict[str, Any]]:
        updated: list[dict[str, Any]] = []
        for row in self.tables.get(table, []):
            if self._matches(row, params):
                row.update(deepcopy(payload))
                updated.append(deepcopy(row))
        self.operations.append(("update", table, deepcopy(payload)))
        return updated

    def delete(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        deleted = [
            deepcopy(row)
            for row in self.tables.get(table, [])
            if self._matches(row, params)
        ]
        self.tables[table] = [
            row for row in self.tables.get(table, []) if not self._matches(row, params)
        ]
        self.operations.append(("delete", table, deepcopy(params)))
        return deleted

    @staticmethod
    def _matches(row: dict[str, Any], params: dict[str, str]) -> bool:
        for field, expression in params.items():
            if field in {"select", "order", "limit", "offset"}:
                continue
            operator, expected = expression.split(".", 1)
            actual = row.get(field)
            if operator == "eq" and str(actual).lower() != expected.lower():
                return False
            if operator == "neq" and str(actual).lower() == expected.lower():
                return False
        return True


def _token() -> str:
    return jwt.encode(
        {
            "id": USER_ID,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        TEST_SIGNING_KEY,
        algorithm="HS256",
    )


@pytest.fixture
def store(monkeypatch: pytest.MonkeyPatch) -> FakeStore:
    fake = FakeStore()
    monkeypatch.setenv("JWT_SECRET", TEST_SIGNING_KEY)
    app.dependency_overrides[get_store] = lambda: fake
    yield fake
    app.dependency_overrides.clear()


@pytest.fixture
def client(store: FakeStore) -> TestClient:
    del store
    return TestClient(app)


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_token()}"}


def test_financial_routes_require_authentication(client: TestClient) -> None:
    response = client.get("/accounts")
    assert response.status_code == 401


def test_accounts_only_return_current_user_rows(client: TestClient) -> None:
    response = client.get("/api/v2/accounts", headers=_headers())
    assert response.status_code == 200
    accounts = response.json()["data"]["accounts"]
    assert [account["id"] for account in accounts] == ["account-1"]


def test_account_creation_injects_user_ownership(
    client: TestClient, store: FakeStore
) -> None:
    response = client.post(
        "/accounts",
        headers=_headers(),
        json={
            "name": "Ahorro",
            "account_type": "savings",
            "balance": 500,
            "is_default": False,
        },
    )
    assert response.status_code == 201
    inserted = next(operation for operation in store.operations if operation[0] == "insert")
    assert inserted[2]["user_id"] == USER_ID


def test_categories_preserve_legacy_combined_contract(client: TestClient) -> None:
    response = client.get("/categories", headers=_headers())
    assert response.status_code == 200
    categories = response.json()["data"]["categories"]
    assert {category["source"] for category in categories} == {"default", "user"}
    assert [category["name"] for category in categories] == sorted(
        category["name"] for category in categories
    )


def test_transactions_filter_paginate_and_enrich(client: TestClient) -> None:
    response = client.get(
        "/transactions",
        headers=_headers(),
        params={"type": "expense", "year": 2026, "month": 8, "page": 1, "limit": 10},
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["pagination"] == {"total": 1, "page": 1, "limit": 10, "pages": 1}
    assert body["transactions"][0]["category"] == "Alimentos"
    assert body["transactions"][0]["credit_card_name"] == "Tarjeta principal"


def test_transaction_years_match_legacy_shape(client: TestClient) -> None:
    response = client.get("/transactions/years", headers=_headers())
    assert response.status_code == 200
    assert response.json()["data"]["years"] == [{"year": 2026}]


def test_credit_card_update_is_scoped_to_owner(
    client: TestClient, store: FakeStore
) -> None:
    response = client.put(
        "/credit/cards/card-1",
        headers=_headers(),
        json={"balance": 2100},
    )
    assert response.status_code == 200
    assert response.json()["data"]["card"]["balance"] == 2100
    assert store.tables["credit_cards"][0]["user_id"] == USER_ID


def test_card_spending_uses_compatible_response_shape(client: TestClient) -> None:
    response = client.get(
        "/credit/cards/card-1/spending",
        headers=_headers(),
        params={"year": 2026, "month": 8},
    )
    assert response.status_code == 200
    transactions = response.json()["data"]["transactions"]
    assert [transaction["id"] for transaction in transactions] == ["tx-1"]


def test_modern_secret_key_is_not_sent_as_bearer_token() -> None:
    modern_key = "sb_" + "secret_test_value_123456789"
    api = SupabaseRestClient("https://example.supabase.co", modern_key)
    try:
        assert "Authorization" not in api.headers
        assert "apikey" in api.headers
    finally:
        api.close()


def test_legacy_service_role_keeps_authorization_during_overlap() -> None:
    api = SupabaseRestClient("https://example.supabase.co", "legacy-service-role-jwt")
    try:
        assert api.headers["Authorization"].startswith("Bearer ")
    finally:
        api.close()
