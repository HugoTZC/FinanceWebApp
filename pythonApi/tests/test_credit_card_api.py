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
JWT_SECRET = "test-only-credit-card-signing-key"


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "credit_cards": [
                {"id": "card-1", "user_id": USER_ID, "name": "Principal", "last_four": "1234", "balance": 2500},
                {"id": "card-other", "user_id": OTHER_USER_ID, "name": "Ajena", "last_four": "9999", "balance": 9000},
            ],
            "categories": [
                {"id": "food", "name": "Alimentos", "type": "expense", "is_default": True},
                {"id": "salary", "name": "Salario", "type": "income", "is_default": True},
            ],
            "user_categories": [
                {"id": "pets", "user_id": USER_ID, "name": "Mascotas", "type": "expense"},
                {"id": "other-category", "user_id": OTHER_USER_ID, "name": "Privada", "type": "expense"},
            ],
            "transactions": [
                {"id": "tx-food-aug", "user_id": USER_ID, "credit_card_id": "card-1", "amount": 500, "type": "expense", "transaction_date": "2026-08-20", "category_id": "food", "user_category_id": None},
                {"id": "tx-pets-aug", "user_id": USER_ID, "credit_card_id": "card-1", "amount": 200, "type": "expense", "transaction_date": "2026-08-21", "category_id": None, "user_category_id": "pets"},
                {"id": "tx-food-jul", "user_id": USER_ID, "credit_card_id": "card-1", "amount": 100, "type": "expense", "transaction_date": "2026-07-10", "category_id": "food", "user_category_id": None},
                {"id": "tx-income", "user_id": USER_ID, "credit_card_id": "card-1", "amount": 1000, "type": "income", "transaction_date": "2026-08-25", "category_id": "salary", "user_category_id": None},
                {"id": "tx-other-user", "user_id": OTHER_USER_ID, "credit_card_id": "card-1", "amount": 9999, "type": "expense", "transaction_date": "2026-08-22", "category_id": "food", "user_category_id": None},
            ],
        }

    def select(self, table: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        params = params or {}
        return [deepcopy(row) for row in self.tables.get(table, []) if self._matches(row, params)]

    def insert(self, table: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        row = deepcopy(payload) | {"id": f"{table}-new"}
        self.tables.setdefault(table, []).append(row)
        return [deepcopy(row)]

    def update(self, table: str, payload: dict[str, Any], params: dict[str, str]) -> list[dict[str, Any]]:
        updated = []
        for row in self.tables.get(table, []):
            if self._matches(row, params):
                row.update(deepcopy(payload))
                updated.append(deepcopy(row))
        return updated

    def delete(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        deleted = [deepcopy(row) for row in self.tables.get(table, []) if self._matches(row, params)]
        self.tables[table] = [row for row in self.tables.get(table, []) if not self._matches(row, params)]
        return deleted

    @staticmethod
    def _matches(row: dict[str, Any], params: dict[str, str]) -> bool:
        for field, expression in params.items():
            if field in {"select", "order", "limit"}:
                continue
            operator, expected = expression.split(".", 1)
            if operator == "eq" and str(row.get(field)).lower() != expected.lower():
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


def test_credit_card_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v2/credit/cards").status_code == 401
    assert client.get("/api/v2/credit/cards/card-1/spending").status_code == 401


def test_credit_card_crud_is_scoped_to_owner(client: TestClient, store: FakeStore) -> None:
    response = client.get("/api/v2/credit/cards", headers=_headers())
    assert [card["id"] for card in response.json()["data"]["cards"]] == ["card-1"]

    created = client.post(
        "/api/v2/credit/cards",
        headers=_headers(),
        json={"name": "Nueva", "last_four": "5678", "credit_limit": 12000},
    )
    assert created.status_code == 201
    assert created.json()["data"]["card"]["user_id"] == USER_ID

    updated = client.put(
        "/api/v2/credit/cards/card-1", headers=_headers(), json={"balance": 2100}
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["card"]["balance"] == 2100

    assert client.get("/api/v2/credit/cards/card-other", headers=_headers()).status_code == 404
    assert client.put(
        "/api/v2/credit/cards/card-other", headers=_headers(), json={"balance": 0}
    ).status_code == 404
    assert client.delete("/api/v2/credit/cards/card-other", headers=_headers()).status_code == 404
    assert store.tables["credit_cards"][1]["balance"] == 9000


def test_recent_spending_filters_and_enriches_categories(client: TestClient) -> None:
    response = client.get(
        "/api/v2/credit/cards/card-1/spending",
        headers=_headers(),
        params={"year": 2026, "month": 8},
    )
    assert response.status_code == 200
    transactions = response.json()["data"]["transactions"]
    assert {transaction["id"] for transaction in transactions} == {"tx-food-aug", "tx-pets-aug", "tx-income"}
    assert {transaction["category_name"] for transaction in transactions} == {"Alimentos", "Mascotas", "Salario"}


def test_category_spending_supports_month_and_full_year(client: TestClient) -> None:
    monthly = client.get(
        "/api/v2/credit/cards/card-1/spending/categories/2026/8", headers=_headers()
    )
    assert monthly.status_code == 200
    assert monthly.json()["data"]["categories"] == [
        {"category_name": "Alimentos", "amount": 500.0},
        {"category_name": "Mascotas", "amount": 200.0},
    ]

    yearly = client.get(
        "/api/v2/credit/cards/card-1/spending/categories/2026", headers=_headers()
    )
    assert yearly.status_code == 200
    assert yearly.json()["data"]["categories"] == [
        {"category_name": "Alimentos", "amount": 600.0},
        {"category_name": "Mascotas", "amount": 200.0},
    ]


def test_monthly_spending_returns_all_twelve_months(client: TestClient) -> None:
    response = client.get(
        "/api/v2/credit/cards/card-1/spending/monthly/2026", headers=_headers()
    )
    assert response.status_code == 200
    spending = response.json()["data"]["spending"]
    assert len(spending) == 12
    assert spending[6] == {"month": "Jul", "amount": 100.0}
    assert spending[7] == {"month": "Aug", "amount": 700.0}


def test_reports_reject_foreign_cards_and_invalid_parameters(client: TestClient) -> None:
    assert client.get(
        "/api/v2/credit/cards/card-other/spending/categories/2026", headers=_headers()
    ).status_code == 404
    assert client.get(
        "/api/v2/credit/cards/card-1/spending/categories/2026/13", headers=_headers()
    ).status_code == 422
    assert client.post(
        "/api/v2/credit/cards", headers=_headers(), json={"name": "Inválida", "last_four": "12x4"}
    ).status_code == 422
    assert client.put(
        "/api/v2/credit/cards/card-1", headers=_headers(), json={}
    ).status_code == 400
