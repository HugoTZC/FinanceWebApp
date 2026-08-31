from __future__ import annotations

from copy import deepcopy
from datetime import UTC, date, datetime, timedelta
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

import analysis_api
from app import app
from auth_api import get_store


USER_ID = "11111111-1111-4111-8111-111111111111"
OTHER_ID = "22222222-2222-4222-8222-222222222222"
SECRET = "test-only-analysis-signing-key-at-least-32-bytes"
TODAY = date(2026, 8, 30)


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "budget_periods": [
                {"id": "period-1", "user_id": USER_ID, "year": 2026, "month": 8, "start_date": "2026-08-01", "end_date": "2026-08-31"},
                {"id": "private-period", "user_id": OTHER_ID, "year": 2026, "month": 8, "start_date": "2026-08-01", "end_date": "2026-08-31"},
            ],
            "budget_categories": [
                {"id": "bc-food", "budget_period_id": "period-1", "category_id": "food", "user_category_id": None, "amount": 800},
                {"id": "bc-private", "budget_period_id": "private-period", "category_id": "food", "amount": 99999},
            ],
            "transactions": [
                {"id": "income", "user_id": USER_ID, "type": "income", "amount": 3000, "transaction_date": "2026-08-29"},
                {"id": "food", "user_id": USER_ID, "type": "expense", "amount": 500, "category_id": "food", "transaction_date": "2026-08-28"},
                {"id": "old", "user_id": USER_ID, "type": "expense", "amount": 100, "category_id": "food", "transaction_date": "2026-07-20"},
                {"id": "private", "user_id": OTHER_ID, "type": "income", "amount": 99999, "transaction_date": "2026-08-29"},
            ],
            "recurring_payments": [
                {"id": "rent", "user_id": USER_ID, "name": "Rent", "amount": 1200, "due_date": "2026-09-02"},
                {"id": "private-payment", "user_id": OTHER_ID, "name": "Private", "amount": 99999, "due_date": "2026-09-01"},
            ],
            "credit_cards": [{"id": "card", "user_id": USER_ID, "name": "Card", "min_payment": 300, "due_date": "2026-09-05"}],
            "loans": [{"id": "loan", "user_id": USER_ID, "name": "Loan", "monthly_payment": 250, "due_date": "2026-10-01"}],
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
    monkeypatch.setattr(analysis_api, "_today", lambda: TODAY)
    store = FakeStore()
    app.dependency_overrides[get_store] = lambda: store
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_analysis_routes_require_authentication(client: TestClient) -> None:
    for path in ("budget", "weekly", "due-dates", "obligations", "monthly"):
        assert client.get(f"/api/v2/analysis/{path}").status_code == 401


def test_budget_analysis_is_owner_scoped_and_matches_contract(client: TestClient) -> None:
    response = client.get("/api/v2/analysis/budget?year=2026&month=8", headers=headers())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["budget_period"]["id"] == "period-1"
    assert data["categories"][0]["spent"] == 500
    assert data["total_budget"] == 800
    assert data["remaining"] == 300


def test_weekly_monthly_and_obligations_exclude_other_users(client: TestClient) -> None:
    weekly = client.get("/api/v2/analysis/weekly?weeks_back=2", headers=headers()).json()["data"]
    assert len(weekly) == 2
    assert sum(item["income"] for item in weekly) == 3000
    obligations = client.get("/api/v2/analysis/obligations", headers=headers()).json()["data"]
    assert obligations == {"recurring_payments_total": 1200.0, "credit_cards_total": 300.0, "loans_total": 250.0, "total": 1750.0}
    monthly = client.get("/api/v2/analysis/monthly?months=2", headers=headers()).json()["data"]
    assert monthly == [
        {"month": "Jul", "year": 2026, "income": 0.0, "expenses": 100.0},
        {"month": "Aug", "year": 2026, "income": 3000.0, "expenses": 500.0},
    ]


def test_due_dates_are_limited_sorted_and_owner_scoped(client: TestClient) -> None:
    response = client.get("/api/v2/analysis/due-dates?days=7", headers=headers()).json()
    assert response["count"] == 2
    assert [item["id"] for item in response["data"]] == ["rent", "card"]
    assert [item["days_until_due"] for item in response["data"]] == [3, 6]


def test_analysis_query_limits_are_validated(client: TestClient) -> None:
    assert client.get("/api/v2/analysis/weekly?weeks_back=0", headers=headers()).status_code == 422
    assert client.get("/api/v2/analysis/monthly?months=37", headers=headers()).status_code == 422
    assert client.get("/api/v2/analysis/budget?month=13", headers=headers()).status_code == 422
