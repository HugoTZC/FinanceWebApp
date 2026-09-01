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
OTHER_ID = "22222222-2222-4222-8222-222222222222"
SECRET = "test-only-dashboard-signing-key-at-least-32-bytes"


class FakeStore:
    def __init__(self) -> None:
        now = datetime.now(UTC)
        previous = now.replace(day=1) - timedelta(days=1)
        self.tables = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "categories": [{"id": "food", "name": "Food", "type": "expense"}, {"id": "salary", "name": "Salary", "type": "income"}],
            "user_categories": [],
            "bank_accounts": [],
            "credit_cards": [],
            "transactions": [
                {"id": "income", "user_id": USER_ID, "title": "Salary", "amount": 3000, "type": "income", "category_id": "salary", "transaction_date": now.date().isoformat()},
                {"id": "expense", "user_id": USER_ID, "title": "Market", "amount": 500, "type": "expense", "category_id": "food", "transaction_date": now.date().isoformat()},
                {"id": "card-payment", "user_id": USER_ID, "title": "Card payment", "amount": 250, "type": "expense", "payment_method": "credit_card_payment", "credit_card_id": "card-1", "category_id": None, "transaction_date": now.date().isoformat()},
                {"id": "previous", "user_id": USER_ID, "title": "Old", "amount": 100, "type": "expense", "category_id": "food", "transaction_date": previous.date().isoformat()},
                {"id": "private", "user_id": OTHER_ID, "title": "Private", "amount": 99999, "type": "income", "category_id": "salary", "transaction_date": now.date().isoformat()},
            ],
        }
    def select(self, table: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        params = params or {}
        rows = [deepcopy(row) for row in self.tables.get(table, [])]
        for key, expression in params.items():
            if key in {"select", "order", "limit"}: continue
            operator, expected = expression.split(".", 1)
            if operator == "eq": rows = [row for row in rows if str(row.get(key)).lower() == expected.lower()]
        if params.get("order") == "transaction_date.desc": rows.sort(key=lambda row: row.get("transaction_date", ""), reverse=True)
        return rows[: int(params["limit"])] if "limit" in params else rows
    def insert(self, table: str, payload: dict[str, Any]) -> list[dict[str, Any]]: raise NotImplementedError
    def update(self, table: str, payload: dict[str, Any], params: dict[str, str]) -> list[dict[str, Any]]: raise NotImplementedError
    def delete(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]: raise NotImplementedError


def headers() -> dict[str, str]:
    token = jwt.encode({"id": USER_ID, "iat": datetime.now(UTC), "exp": datetime.now(UTC) + timedelta(hours=1)}, SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("JWT_SECRET", SECRET)
    store = FakeStore()
    app.dependency_overrides[get_store] = lambda: store
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_dashboard_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v2/dashboard/overview").status_code == 401
    assert client.get("/api/v2/dashboard/transactions/recent").status_code == 401


def test_dashboard_overview_categories_and_recent_are_owner_scoped(client: TestClient) -> None:
    now = datetime.now(UTC)
    overview = client.get("/api/v2/dashboard/overview", headers=headers()).json()["data"]
    assert overview["currentMonth"]["income"] == 3000
    assert overview["currentMonth"]["expenses"] == 500
    categories = client.get(f"/api/v2/dashboard/categories/{now.year}/{now.month}", headers=headers()).json()["data"]
    assert categories == [{"name": "Food", "value": 500.0, "color": "#4ade80"}]
    recent = client.get("/api/v2/dashboard/transactions/recent?limit=2", headers=headers()).json()["data"]["transactions"]
    assert len(recent) == 2
    assert all(row["user_id"] == USER_ID for row in recent)


def test_dashboard_monthly_contract_and_validation(client: TestClient) -> None:
    now = datetime.now(UTC)
    data = client.get(f"/api/v2/dashboard/monthly/{now.year}", headers=headers()).json()["data"]
    assert len(data) == 12
    assert data[now.month - 1]["income"] == 3000
    assert client.get("/api/v2/dashboard/transactions/recent?limit=21", headers=headers()).status_code == 422
