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
JWT_SECRET = "test-only-transaction-signing-key"


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "categories": [
                {"id": "food", "name": "Alimentos", "type": "expense"},
                {"id": "salary", "name": "Salario", "type": "income"},
            ],
            "user_categories": [
                {"id": "pets", "user_id": USER_ID, "name": "Mascotas", "type": "expense"},
                {"id": "private-category", "user_id": OTHER_USER_ID, "name": "Privada", "type": "expense"},
            ],
            "bank_accounts": [
                {"id": "account-1", "user_id": USER_ID, "name": "Principal", "balance": 1000},
                {"id": "account-other", "user_id": OTHER_USER_ID, "name": "Ajena", "balance": 9000},
            ],
            "credit_cards": [
                {"id": "card-1", "user_id": USER_ID, "name": "Tarjeta", "balance": 2500},
                {"id": "card-other", "user_id": OTHER_USER_ID, "name": "Ajena", "balance": 9000},
            ],
            "savings_goals": [{"id": "goal-1", "user_id": USER_ID, "name": "Viaje"}],
            "recurring_payments": [],
            "transactions": [
                {"id": "tx-food", "user_id": USER_ID, "title": "Supermercado", "amount": 500, "transaction_date": "2026-08-20", "type": "expense", "category_id": "food", "user_category_id": None, "payment_method": "credit_card", "bank_account_id": None, "credit_card_id": "card-1"},
                {"id": "tx-pets", "user_id": USER_ID, "title": "Veterinario", "amount": 200, "transaction_date": "2026-08-21", "type": "expense", "category_id": None, "user_category_id": "pets", "payment_method": "cash", "bank_account_id": None, "credit_card_id": None},
                {"id": "tx-income", "user_id": USER_ID, "title": "Nómina", "amount": 3000, "transaction_date": "2026-08-15", "type": "income", "category_id": "salary", "user_category_id": None, "payment_method": "cash", "bank_account_id": None, "credit_card_id": None},
                {"id": "tx-july", "user_id": USER_ID, "title": "Julio", "amount": 100, "transaction_date": "2026-07-01", "type": "expense", "category_id": "food", "user_category_id": None, "payment_method": "cash", "bank_account_id": None, "credit_card_id": None},
                {"id": "tx-other", "user_id": OTHER_USER_ID, "title": "Privada", "amount": 9999, "transaction_date": "2026-08-20", "type": "expense", "category_id": "food", "user_category_id": None, "payment_method": "cash", "bank_account_id": None, "credit_card_id": None},
            ],
        }

    def select(self, table: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        params = params or {}
        rows = [deepcopy(row) for row in self.tables.get(table, []) if self._matches(row, params)]
        if "limit" in params:
            rows = rows[: int(params["limit"])]
        return rows

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


def test_transaction_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v2/transactions").status_code == 401
    assert client.post("/api/v2/transactions", json={}).status_code == 401


def test_list_filters_paginates_and_enriches(client: TestClient) -> None:
    response = client.get(
        "/api/v2/transactions",
        headers=_headers(),
        params={"year": 2026, "month": 8, "type": "expense", "page": 1, "limit": 1},
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["pagination"] == {"total": 2, "page": 1, "limit": 1, "pages": 2}
    assert body["transactions"][0]["category"] == "Alimentos"
    assert body["transactions"][0]["credit_card_name"] == "Tarjeta"
    assert all(row["user_id"] == USER_ID for row in body["transactions"])


def test_custom_category_filter_matches_user_category(client: TestClient) -> None:
    response = client.get(
        "/api/v2/transactions", headers=_headers(), params={"category": "pets"}
    )
    assert [row["id"] for row in response.json()["data"]["transactions"]] == ["tx-pets"]


def test_create_resolves_category_and_validates_owned_payment_resource(client: TestClient, store: FakeStore) -> None:
    created = client.post(
        "/api/v2/transactions",
        headers=_headers(),
        json={"title": "Cena", "amount": 250, "transaction_date": "2026-08-30T06:00:00.000Z", "type": "expense", "category": "food", "payment_method": "credit-card", "credit_card_id": "card-1"},
    )
    assert created.status_code == 201
    transaction = created.json()["data"]["transaction"]
    assert transaction["user_id"] == USER_ID
    assert transaction["category_id"] == "food"
    assert transaction["payment_method"] == "credit_card"
    assert transaction["credit_card_id"] == "card-1"
    assert store.tables["credit_cards"][0]["balance"] == 2750

    assert client.post(
        "/api/v2/transactions",
        headers=_headers(),
        json={"title": "Ataque", "amount": 1, "transaction_date": "2026-08-30", "type": "expense", "category": "food", "payment_method": "bank_account", "bank_account_id": "account-other"},
    ).status_code == 404
    assert client.post(
        "/api/v2/transactions",
        headers=_headers(),
        json={"title": "Categoría ajena", "amount": 1, "transaction_date": "2026-08-30", "type": "expense", "category": "private-category"},
    ).status_code == 400


def test_detail_update_delete_are_owner_scoped(client: TestClient, store: FakeStore) -> None:
    detail = client.get("/api/v2/transactions/tx-food", headers=_headers())
    assert detail.status_code == 200
    assert detail.json()["data"]["transaction"]["category_name"] == "Alimentos"

    updated = client.patch(
        "/api/v2/transactions/tx-food",
        headers=_headers(),
        json={"title": "Mercado", "category_id": "pets", "payment_method": "cash"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["transaction"]["title"] == "Mercado"
    assert updated.json()["data"]["transaction"]["user_category_id"] == "pets"
    assert updated.json()["data"]["transaction"]["credit_card_id"] is None
    assert store.tables["credit_cards"][0]["balance"] == 2000

    assert client.get("/api/v2/transactions/tx-other", headers=_headers()).status_code == 404
    assert client.patch("/api/v2/transactions/tx-other", headers=_headers(), json={"amount": 1}).status_code == 404
    assert client.delete("/api/v2/transactions/tx-other", headers=_headers()).status_code == 404
    assert any(row["id"] == "tx-other" and row["amount"] == 9999 for row in store.tables["transactions"])
    assert client.delete("/api/v2/transactions/tx-pets", headers=_headers()).status_code == 204


def test_years_summary_and_category_breakdown(client: TestClient) -> None:
    years = client.get("/api/v2/transactions/years", headers=_headers())
    assert years.json()["data"]["years"] == [{"year": 2026}]

    summary = client.get("/api/v2/transactions/summary/2026/8", headers=_headers())
    assert summary.json()["data"]["summary"] == {"total_income": 3000.0, "total_expenses": 700.0, "net_flow": 2300.0}

    categories = client.get("/api/v2/transactions/categories/2026/8", headers=_headers())
    assert categories.json()["data"]["categories"] == [
        {"category_name": "Salario", "category_type": "income", "total_amount": 3000.0, "transaction_count": 1},
        {"category_name": "Alimentos", "category_type": "expense", "total_amount": 500.0, "transaction_count": 1},
        {"category_name": "Mascotas", "category_type": "expense", "total_amount": 200.0, "transaction_count": 1},
    ]


def test_card_transactions_require_owned_card(client: TestClient) -> None:
    response = client.get("/api/v2/transactions/card/card-1", headers=_headers())
    assert [row["id"] for row in response.json()["data"]["transactions"]] == ["tx-food"]
    assert client.get("/api/v2/transactions/card/card-other", headers=_headers()).status_code == 404


def test_invalid_inputs_are_rejected(client: TestClient) -> None:
    assert client.post(
        "/api/v2/transactions",
        headers=_headers(),
        json={"title": "Cero", "amount": 0, "transaction_date": "2026-08-30", "type": "expense", "category": "food"},
    ).status_code == 422
    assert client.get("/api/v2/transactions", headers=_headers(), params={"month": 13}).status_code == 422
    assert client.patch("/api/v2/transactions/tx-food", headers=_headers(), json={}).status_code == 400
