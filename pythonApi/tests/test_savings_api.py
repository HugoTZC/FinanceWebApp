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
JWT_SECRET = "test-only-savings-signing-key-at-least-32-bytes"


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "savings_goals": [
                {"id": "goal-1", "user_id": USER_ID, "name": "Emergency", "target_amount": 1000, "current_amount": 250, "start_date": "2026-01-01", "target_date": "2026-12-31", "is_completed": False},
                {"id": "goal-other", "user_id": OTHER_USER_ID, "name": "Private", "target_amount": 900, "current_amount": 0, "start_date": "2026-01-01", "target_date": "2026-12-31", "is_completed": False},
            ],
            "recurring_payments": [
                {"id": "payment-1", "user_id": USER_ID, "name": "Insurance", "amount": 600, "current_amount": 100, "due_date": "2026-12-01", "frequency": "yearly", "category": "Insurance"},
                {"id": "payment-other", "user_id": OTHER_USER_ID, "name": "Private", "amount": 100, "current_amount": 0, "due_date": "2026-12-01", "frequency": "monthly", "category": "Other"},
            ],
            "transactions": [
                {"id": "tx-goal", "user_id": USER_ID, "savings_goal_id": "goal-1", "recurring_payment_id": None, "amount": 200, "type": "expense", "payment_method": "savings_deposit", "transaction_date": "2026-08-01"},
                {"id": "tx-wrong-method", "user_id": USER_ID, "savings_goal_id": "goal-1", "recurring_payment_id": None, "amount": 500, "type": "expense", "payment_method": "cash", "transaction_date": "2026-08-02"},
                {"id": "tx-recurring", "user_id": USER_ID, "savings_goal_id": None, "recurring_payment_id": "payment-1", "amount": 75, "type": "expense", "payment_method": "cash", "transaction_date": "2026-08-03"},
                {"id": "tx-other-user", "user_id": OTHER_USER_ID, "savings_goal_id": "goal-1", "recurring_payment_id": "payment-1", "amount": 800, "type": "expense", "payment_method": "savings_deposit", "transaction_date": "2026-08-04"},
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


def test_savings_routes_require_authentication(client: TestClient) -> None:
    for path in ("/api/v2/savings/goals", "/api/v2/savings/recurring"):
        assert client.get(path).status_code == 401
        assert client.post(path, json={}).status_code == 401


def test_goal_crud_is_scoped_and_put_compatible(client: TestClient, store: FakeStore) -> None:
    listed = client.get("/api/v2/savings/goals", headers=_headers())
    assert [row["id"] for row in listed.json()["data"]["goals"]] == ["goal-1"]
    assert client.get("/api/v2/savings/goals/goal-other", headers=_headers()).status_code == 404

    created = client.post(
        "/api/v2/savings/goals", headers=_headers(),
        json={"name": "Vacation", "target_amount": 500, "current_amount": 500, "start_date": "2026-08-01", "target_date": "2026-10-01"},
    )
    assert created.status_code == 201
    assert created.json()["data"]["goal"]["is_completed"] is True

    updated = client.put(
        "/api/v2/savings/goals/goal-1", headers=_headers(), json={"current_amount": 1000}
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["goal"]["is_completed"] is True
    assert client.delete("/api/v2/savings/goals/goal-other", headers=_headers()).status_code == 404
    assert any(row["id"] == "goal-other" for row in store.tables["savings_goals"])
    assert client.delete("/api/v2/savings/goals/goal-1", headers=_headers()).status_code == 204


def test_goal_dates_and_empty_updates_are_rejected(client: TestClient) -> None:
    assert client.post(
        "/api/v2/savings/goals", headers=_headers(),
        json={"name": "Invalid", "target_amount": 100, "start_date": "2026-09-01", "target_date": "2026-08-01"},
    ).status_code == 422
    assert client.patch("/api/v2/savings/goals/goal-1", headers=_headers(), json={}).status_code == 400
    assert client.patch(
        "/api/v2/savings/goals/goal-1", headers=_headers(), json={"target_date": "2025-01-01"}
    ).status_code == 400


def test_goal_progress_counts_only_owned_savings_deposits(client: TestClient) -> None:
    response = client.get("/api/v2/savings/goals/goal-1/progress", headers=_headers())
    assert response.status_code == 200
    progress = response.json()["data"]["progress"]
    assert progress["total_contributions"] == 200
    assert progress["contribution_count"] == 1
    assert client.get("/api/v2/savings/goals/goal-other/progress", headers=_headers()).status_code == 404


def test_recurring_crud_is_scoped(client: TestClient, store: FakeStore) -> None:
    listed = client.get("/api/v2/savings/recurring", headers=_headers())
    assert [row["id"] for row in listed.json()["data"]["payments"]] == ["payment-1"]
    created = client.post(
        "/api/v2/savings/recurring", headers=_headers(),
        json={"name": "Rent", "amount": 1200, "current_amount": 0, "due_date": "2026-09-01", "frequency": "monthly", "category": "Housing"},
    )
    assert created.status_code == 201
    assert created.json()["data"]["payment"]["user_id"] == USER_ID
    assert client.patch(
        "/api/v2/savings/recurring/payment-1", headers=_headers(), json={"current_amount": 175}
    ).json()["data"]["payment"]["current_amount"] == 175
    assert client.get("/api/v2/savings/recurring/payment-other", headers=_headers()).status_code == 404
    assert client.delete("/api/v2/savings/recurring/payment-other", headers=_headers()).status_code == 404
    assert any(row["id"] == "payment-other" for row in store.tables["recurring_payments"])


def test_recurring_progress_counts_only_owned_expenses(client: TestClient) -> None:
    response = client.get("/api/v2/savings/recurring/payment-1/progress", headers=_headers())
    assert response.status_code == 200
    progress = response.json()["data"]["progress"]
    assert progress["total_contributions"] == 75
    assert progress["contribution_count"] == 1
    assert client.get("/api/v2/savings/recurring/payment-other/progress", headers=_headers()).status_code == 404


def test_invalid_recurring_values_are_rejected(client: TestClient) -> None:
    assert client.post(
        "/api/v2/savings/recurring", headers=_headers(),
        json={"name": "Bad", "amount": -1, "due_date": "2026-09-01", "frequency": "monthly", "category": "Other"},
    ).status_code == 422
    assert client.post(
        "/api/v2/savings/recurring", headers=_headers(),
        json={"name": "Bad", "amount": 1, "due_date": "2026-09-01", "frequency": "sometimes", "category": "Other"},
    ).status_code == 422
    assert client.patch("/api/v2/savings/recurring/payment-1", headers=_headers(), json={}).status_code == 400
