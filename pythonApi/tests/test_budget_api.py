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
JWT_SECRET = "test-only-budget-signing-key-at-least-32-bytes"
NOW = datetime.now(UTC)


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "categories": [
                {"id": "cat-food", "name": "Food", "type": "expense", "category_group": "Essential", "color": "#abc"},
                {"id": "cat-income", "name": "Salary", "type": "income", "category_group": "Income"},
            ],
            "user_categories": [
                {"id": "cat-custom", "user_id": USER_ID, "name": "Coffee", "type": "expense", "category_group": "Discretionary"},
                {"id": "cat-other", "user_id": OTHER_USER_ID, "name": "Private", "type": "expense"},
            ],
            "budget_periods": [
                {"id": "period-owner", "user_id": USER_ID, "year": NOW.year, "month": NOW.month, "start_date": f"{NOW.year:04d}-{NOW.month:02d}-01"},
                {"id": "period-other", "user_id": OTHER_USER_ID, "year": NOW.year, "month": NOW.month},
            ],
            "budget_categories": [
                {"id": "budget-food", "budget_period_id": "period-owner", "category_id": "cat-food", "user_category_id": None, "amount": 100},
                {"id": "budget-other", "budget_period_id": "period-other", "category_id": "cat-food", "user_category_id": None, "amount": 999},
            ],
            "budget_alerts": [],
            "transactions": [
                {"id": "expense", "user_id": USER_ID, "category_id": "cat-food", "user_category_id": None, "amount": 80, "type": "expense", "transaction_date": f"{NOW.year:04d}-{NOW.month:02d}-03"},
                {"id": "income", "user_id": USER_ID, "category_id": "cat-food", "user_category_id": None, "amount": 500, "type": "income", "transaction_date": f"{NOW.year:04d}-{NOW.month:02d}-04"},
                {"id": "other", "user_id": OTHER_USER_ID, "category_id": "cat-food", "user_category_id": None, "amount": 900, "type": "expense", "transaction_date": f"{NOW.year:04d}-{NOW.month:02d}-05"},
            ],
        }
        self.counter = 0

    def select(self, table: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        params = params or {}
        return [deepcopy(row) for row in self.tables.get(table, []) if self._matches(row, params)]

    def insert(self, table: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        self.counter += 1
        row = deepcopy(payload) | {"id": f"{table}-{self.counter}"}
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


def test_budget_routes_require_authentication(client: TestClient) -> None:
    assert client.get(f"/api/v2/budgets/{NOW.year}/{NOW.month}").status_code == 401
    assert client.post("/api/v2/budgets", json={}).status_code == 401
    assert client.get("/api/v2/budgets/alerts").status_code == 401


def test_budget_read_calculates_only_owned_expenses(client: TestClient) -> None:
    response = client.get(f"/api/v2/budgets/{NOW.year}/{NOW.month}", headers=_headers())
    assert response.status_code == 200
    categories = response.json()["data"]["budget"]["categories"]
    assert len(categories) == 1
    assert categories[0]["spent"] == 80
    assert categories[0]["remaining"] == 20


def test_budget_upsert_validates_category_ownership_and_type(client: TestClient, store: FakeStore) -> None:
    response = client.post(
        "/api/v2/budgets",
        headers=_headers(),
        json={"year": NOW.year, "month": NOW.month, "categories": [{"user_category_id": "cat-custom", "amount": 25}]},
    )
    assert response.status_code == 201
    assert response.json()["data"]["budget"]["categories"][0]["user_category_id"] == "cat-custom"

    updated = client.post(
        "/api/v2/budgets",
        headers=_headers(),
        json={"year": NOW.year, "month": NOW.month, "categories": [{"category_id": "cat-food", "amount": 120}]},
    )
    assert updated.status_code == 201
    assert next(row for row in store.tables["budget_categories"] if row["id"] == "budget-food")["amount"] == 120

    assert client.post(
        "/api/v2/budgets", headers=_headers(),
        json={"year": NOW.year, "month": NOW.month, "categories": [{"user_category_id": "cat-other", "amount": 10}]},
    ).status_code == 400
    assert client.post(
        "/api/v2/budgets", headers=_headers(),
        json={"year": NOW.year, "month": NOW.month, "categories": [{"category_id": "cat-income", "amount": 10}]},
    ).status_code == 400


def test_budget_category_delete_and_spending_are_owner_scoped(client: TestClient, store: FakeStore) -> None:
    spending = client.get(
        f"/api/v2/budgets/categories/budget-food/spending?year={NOW.year}&month={NOW.month}", headers=_headers()
    )
    assert spending.status_code == 200
    assert spending.json()["data"]["spending"] == 80
    assert client.delete("/api/v2/budgets/categories/budget-other", headers=_headers()).status_code == 404
    assert any(row["id"] == "budget-other" for row in store.tables["budget_categories"])
    assert client.delete("/api/v2/budgets/categories/budget-food", headers=_headers()).status_code == 204


def test_alerts_are_persistent_dismissible_and_owner_scoped(client: TestClient, store: FakeStore) -> None:
    response = client.get("/api/v2/budgets/alerts", headers=_headers())
    assert response.status_code == 200
    alerts = response.json()["data"]["alerts"]
    assert len(alerts) == 1
    assert alerts[0]["spent_amount"] == 80
    assert alerts[0]["threshold_percentage"] == 80
    alert_id = alerts[0]["id"]

    assert client.patch(f"/api/v2/budgets/alerts/{alert_id}", headers=_headers()).status_code == 200
    assert client.get("/api/v2/budgets/alerts", headers=_headers()).json()["data"]["alerts"] == []

    store.tables["budget_alerts"].append({"id": "alert-other", "user_id": OTHER_USER_ID, "budget_category_id": "budget-other", "is_read": False})
    assert client.patch("/api/v2/budgets/alerts/alert-other", headers=_headers()).status_code == 404
    assert store.tables["budget_alerts"][-1]["is_read"] is False
