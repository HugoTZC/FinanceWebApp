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
JWT_SECRET = "test-only-loan-signing-key-at-least-32-bytes"


class FakeStore:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [{"id": USER_ID, "email": "owner@example.test"}],
            "loans": [
                {"id": "loan-1", "user_id": USER_ID, "name": "Auto", "loan_type": "auto", "original_amount": 200000, "balance": 150000, "interest_rate": 12, "term": 5, "monthly_payment": 4500, "start_date": "2026-01-01T00:00:00", "end_date": "2031-01-01T00:00:00"},
                {"id": "loan-other", "user_id": OTHER_USER_ID, "name": "Ajeno", "loan_type": "personal", "original_amount": 50000, "balance": 40000, "interest_rate": 15, "term": 2, "monthly_payment": 2500, "start_date": "2026-01-01T00:00:00+00:00", "end_date": None},
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


def test_loan_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v2/credit/loans").status_code == 401
    assert client.post("/api/v2/credit/loans", json={}).status_code == 401


def test_loan_crud_is_scoped_to_owner(client: TestClient, store: FakeStore) -> None:
    response = client.get("/api/v2/credit/loans", headers=_headers())
    assert [loan["id"] for loan in response.json()["data"]["loans"]] == ["loan-1"]

    created = client.post(
        "/api/v2/credit/loans",
        headers=_headers(),
        json={"name": "Hipoteca", "loan_type": "mortgage", "bank_number": "12345", "original_amount": 1500000, "balance": 1450000, "interest_rate": 9.5, "term": "20 years", "monthly_payment": 15000, "due_date": "2026-09-15T06:00:00.000Z", "start_date": "2026-08-30T00:00:00Z", "end_date": "2046-08-30T00:00:00Z"},
    )
    assert created.status_code == 201
    loan = created.json()["data"]["loan"]
    assert loan["user_id"] == USER_ID
    assert loan["term"] == 20
    assert loan["due_date"] == "2026-09-15"

    updated = client.put(
        "/api/v2/credit/loans/loan-1", headers=_headers(), json={"balance": 140000, "term": "4 years"}
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["loan"]["balance"] == 140000
    assert updated.json()["data"]["loan"]["term"] == 4

    assert client.get("/api/v2/credit/loans/loan-other", headers=_headers()).status_code == 404
    assert client.put("/api/v2/credit/loans/loan-other", headers=_headers(), json={"balance": 0}).status_code == 404
    assert client.delete("/api/v2/credit/loans/loan-other", headers=_headers()).status_code == 404
    assert store.tables["loans"][1]["balance"] == 40000
    assert client.delete("/api/v2/credit/loans/loan-1", headers=_headers()).status_code == 204


def test_original_amount_defaults_to_positive_balance(client: TestClient) -> None:
    response = client.post(
        "/api/v2/credit/loans",
        headers=_headers(),
        json={"name": "Personal", "balance": 10000, "term": 1},
    )
    assert response.status_code == 201
    assert response.json()["data"]["loan"]["original_amount"] == 10000


def test_invalid_financial_values_and_dates_are_rejected(client: TestClient) -> None:
    assert client.post(
        "/api/v2/credit/loans", headers=_headers(), json={"name": "Negativo", "balance": -1}
    ).status_code == 422
    assert client.post(
        "/api/v2/credit/loans", headers=_headers(), json={"name": "Sin monto", "balance": 0}
    ).status_code == 400
    assert client.post(
        "/api/v2/credit/loans", headers=_headers(), json={"name": "Plazo", "balance": 1, "term": "cinco años"}
    ).status_code == 422
    assert client.post(
        "/api/v2/credit/loans",
        headers=_headers(),
        json={"name": "Fechas", "balance": 1, "start_date": "2027-01-01T00:00:00Z", "end_date": "2026-01-01T00:00:00Z"},
    ).status_code == 422
    assert client.put("/api/v2/credit/loans/loan-1", headers=_headers(), json={}).status_code == 400


def test_update_rejects_invalid_resulting_date_range(client: TestClient) -> None:
    response = client.put(
        "/api/v2/credit/loans/loan-1",
        headers=_headers(),
        json={"end_date": "2025-01-01T00:00:00Z"},
    )
    assert response.status_code == 400
