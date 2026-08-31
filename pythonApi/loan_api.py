"""Contract-compatible loan routes for the FastAPI migration."""

from __future__ import annotations

import re
from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from auth_api import CurrentUser, Store


router = APIRouter(prefix="/credit/loans", tags=["loans"])


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


class LoanCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    loan_type: str = Field(default="personal", min_length=1, max_length=50)
    bank_number: str | None = Field(default=None, max_length=50)
    original_amount: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    balance: float = Field(ge=0, allow_inf_nan=False)
    interest_rate: float | None = Field(default=None, ge=0, le=1000, allow_inf_nan=False)
    term: int | None = Field(default=None, gt=0)
    monthly_payment: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    due_date: date | None = None
    start_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    end_date: datetime | None = None

    @field_validator("term", mode="before")
    @classmethod
    def normalize_term(cls, value: Any) -> Any:
        if value in {None, ""}:
            return None
        if isinstance(value, str):
            match = re.fullmatch(r"\s*(\d+)\s*(?:years?|months?)?\s*", value, re.IGNORECASE)
            if not match:
                raise ValueError("Term must begin with a positive whole number")
            return int(match.group(1))
        return value

    @field_validator("due_date", mode="before")
    @classmethod
    def normalize_due_date(cls, value: Any) -> Any:
        return str(value)[:10] if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_dates(self) -> "LoanCreate":
        if self.end_date and _aware(self.end_date) < _aware(self.start_date):
            raise ValueError("End date cannot be before start date")
        return self


class LoanUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    loan_type: str | None = Field(default=None, min_length=1, max_length=50)
    bank_number: str | None = Field(default=None, max_length=50)
    original_amount: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    balance: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    interest_rate: float | None = Field(default=None, ge=0, le=1000, allow_inf_nan=False)
    term: int | None = Field(default=None, gt=0)
    monthly_payment: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    due_date: date | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None

    @field_validator("term", mode="before")
    @classmethod
    def normalize_term(cls, value: Any) -> Any:
        return LoanCreate.normalize_term(value)

    @field_validator("due_date", mode="before")
    @classmethod
    def normalize_due_date(cls, value: Any) -> Any:
        return str(value)[:10] if isinstance(value, str) else value


def _owned(user_id: str, loan_id: str | None = None) -> dict[str, str]:
    params = {"user_id": f"eq.{user_id}"}
    if loan_id is not None:
        params["id"] = f"eq.{loan_id}"
    return params


def _first_or_404(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=404, detail="Loan not found")
    return rows[0]


@router.get("")
def get_loans(user: CurrentUser, store: Store) -> dict[str, Any]:
    loans = store.select(
        "loans",
        {"select": "*", "user_id": f"eq.{user['id']}", "order": "name.asc"},
    )
    return {"status": "success", "data": {"loans": loans}}


@router.post("", status_code=201)
def create_loan(payload: LoanCreate, user: CurrentUser, store: Store) -> dict[str, Any]:
    data = payload.model_dump(mode="json")
    if data["original_amount"] is None:
        if payload.balance <= 0:
            raise HTTPException(status_code=400, detail="Original amount or a positive balance is required")
        data["original_amount"] = payload.balance
    loan = _first_or_404(store.insert("loans", data | {"user_id": user["id"]}))
    return {"status": "success", "data": {"loan": loan}}


@router.get("/{loan_id}")
def get_loan(loan_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    loan = _first_or_404(
        store.select("loans", {"select": "*"} | _owned(str(user["id"]), loan_id))
    )
    return {"status": "success", "data": {"loan": loan}}


@router.put("/{loan_id}")
def update_loan(
    loan_id: str, payload: LoanUpdate, user: CurrentUser, store: Store
) -> dict[str, Any]:
    user_id = str(user["id"])
    current = _first_or_404(
        store.select("loans", {"select": "*"} | _owned(user_id, loan_id))
    )
    changes = payload.model_dump(mode="json", exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    start = changes.get("start_date", current.get("start_date"))
    end = changes.get("end_date", current.get("end_date"))
    if start and end:
        start_date = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
        if _aware(end_date) < _aware(start_date):
            raise HTTPException(status_code=400, detail="End date cannot be before start date")
    loan = _first_or_404(store.update("loans", changes, _owned(user_id, loan_id)))
    return {"status": "success", "data": {"loan": loan}}


@router.delete("/{loan_id}", status_code=204)
def delete_loan(loan_id: str, user: CurrentUser, store: Store) -> Response:
    _first_or_404(store.delete("loans", _owned(str(user["id"]), loan_id)))
    return Response(status_code=204)
