"""Savings goals and recurring payment routes for the FastAPI migration."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator

from auth_api import CurrentUser, DataStore, Store


router = APIRouter(prefix="/savings", tags=["savings"])


class SavingsGoalCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    target_amount: float = Field(gt=0, allow_inf_nan=False)
    current_amount: float = Field(default=0, ge=0, allow_inf_nan=False)
    start_date: date = Field(default_factory=date.today)
    target_date: date

    @model_validator(mode="after")
    def dates_are_ordered(self) -> "SavingsGoalCreate":
        if self.target_date < self.start_date:
            raise ValueError("Target date cannot be before start date")
        return self


class SavingsGoalUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    target_amount: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    current_amount: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    start_date: date | None = None
    target_date: date | None = None
    is_completed: bool | None = None


class RecurringPaymentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0, allow_inf_nan=False)
    current_amount: float = Field(default=0, ge=0, allow_inf_nan=False)
    due_date: date
    frequency: Literal["weekly", "biweekly", "monthly", "quarterly", "yearly"]
    category: str = Field(min_length=1, max_length=100)


class RecurringPaymentUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    amount: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    current_amount: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    due_date: date | None = None
    frequency: Literal["weekly", "biweekly", "monthly", "quarterly", "yearly"] | None = None
    category: str | None = Field(default=None, min_length=1, max_length=100)


def _owned(user_id: str, item_id: str | None = None) -> dict[str, str]:
    params = {"user_id": f"eq.{user_id}"}
    if item_id is not None:
        params["id"] = f"eq.{item_id}"
    return params


def _first_or_404(rows: list[dict[str, Any]], resource: str) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=404, detail=f"{resource} not found")
    return rows[0]


def _changes(payload: BaseModel) -> dict[str, Any]:
    return payload.model_dump(mode="json", exclude_unset=True)


def _validate_goal_result(goal: dict[str, Any]) -> dict[str, Any]:
    start = date.fromisoformat(str(goal["start_date"])[:10])
    target = date.fromisoformat(str(goal["target_date"])[:10])
    if target < start:
        raise HTTPException(status_code=400, detail="Target date cannot be before start date")
    goal["is_completed"] = float(goal.get("current_amount") or 0) >= float(goal["target_amount"])
    return goal


def _transactions_for(store: DataStore, user_id: str, field: str, item_id: str) -> list[dict[str, Any]]:
    return store.select(
        "transactions",
        {"select": "id,amount,type,payment_method,transaction_date", "user_id": f"eq.{user_id}", field: f"eq.{item_id}", "order": "transaction_date.desc"},
    )


@router.get("/goals")
def get_savings_goals(user: CurrentUser, store: Store) -> dict[str, Any]:
    goals = store.select(
        "savings_goals", {"select": "*", "user_id": f"eq.{user['id']}", "order": "is_completed.asc,target_date.asc"}
    )
    return {"status": "success", "data": {"goals": goals}}


@router.post("/goals", status_code=201)
def create_savings_goal(payload: SavingsGoalCreate, user: CurrentUser, store: Store) -> dict[str, Any]:
    data = payload.model_dump(mode="json") | {
        "user_id": user["id"],
        "is_completed": payload.current_amount >= payload.target_amount,
    }
    goal = _first_or_404(store.insert("savings_goals", data), "Savings goal")
    return {"status": "success", "data": {"goal": goal}}


@router.get("/goals/{goal_id}/progress")
def get_savings_goal_progress(goal_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    user_id = str(user["id"])
    goal = _first_or_404(store.select("savings_goals", {"select": "*"} | _owned(user_id, goal_id)), "Savings goal")
    contributions = [
        row for row in _transactions_for(store, user_id, "savings_goal_id", goal_id)
        if row.get("type") == "expense" and row.get("payment_method") == "savings_deposit"
    ]
    progress = goal | {
        "total_contributions": round(sum(float(row.get("amount") or 0) for row in contributions), 2),
        "contribution_count": len(contributions),
    }
    return {"status": "success", "data": {"progress": progress}}


@router.get("/goals/{goal_id}")
def get_savings_goal(goal_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    goal = _first_or_404(store.select("savings_goals", {"select": "*"} | _owned(str(user["id"]), goal_id)), "Savings goal")
    return {"status": "success", "data": {"goal": goal}}


@router.patch("/goals/{goal_id}")
@router.put("/goals/{goal_id}", include_in_schema=False)
def update_savings_goal(goal_id: str, payload: SavingsGoalUpdate, user: CurrentUser, store: Store) -> dict[str, Any]:
    user_id = str(user["id"])
    existing = _first_or_404(store.select("savings_goals", {"select": "*"} | _owned(user_id, goal_id)), "Savings goal")
    changes = _changes(payload)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    combined = _validate_goal_result(existing | changes)
    changes["is_completed"] = combined["is_completed"]
    goal = _first_or_404(store.update("savings_goals", changes, _owned(user_id, goal_id)), "Savings goal")
    return {"status": "success", "data": {"goal": goal}}


@router.delete("/goals/{goal_id}", status_code=204)
def delete_savings_goal(goal_id: str, user: CurrentUser, store: Store) -> Response:
    _first_or_404(store.delete("savings_goals", _owned(str(user["id"]), goal_id)), "Savings goal")
    return Response(status_code=204)


@router.get("/recurring")
def get_recurring_payments(user: CurrentUser, store: Store) -> dict[str, Any]:
    payments = store.select(
        "recurring_payments", {"select": "*", "user_id": f"eq.{user['id']}", "order": "due_date.asc"}
    )
    return {"status": "success", "data": {"payments": payments}}


@router.post("/recurring", status_code=201)
def create_recurring_payment(payload: RecurringPaymentCreate, user: CurrentUser, store: Store) -> dict[str, Any]:
    payment = _first_or_404(
        store.insert("recurring_payments", payload.model_dump(mode="json") | {"user_id": user["id"]}),
        "Recurring payment",
    )
    return {"status": "success", "data": {"payment": payment}}


@router.get("/recurring/{payment_id}/progress")
def get_recurring_payment_progress(payment_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    user_id = str(user["id"])
    payment = _first_or_404(
        store.select("recurring_payments", {"select": "*"} | _owned(user_id, payment_id)), "Recurring payment"
    )
    contributions = [
        row for row in _transactions_for(store, user_id, "recurring_payment_id", payment_id)
        if row.get("type") == "expense"
    ]
    progress = payment | {
        "total_contributions": round(sum(float(row.get("amount") or 0) for row in contributions), 2),
        "contribution_count": len(contributions),
    }
    return {"status": "success", "data": {"progress": progress}}


@router.get("/recurring/{payment_id}")
def get_recurring_payment(payment_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    payment = _first_or_404(
        store.select("recurring_payments", {"select": "*"} | _owned(str(user["id"]), payment_id)), "Recurring payment"
    )
    return {"status": "success", "data": {"payment": payment}}


@router.patch("/recurring/{payment_id}")
def update_recurring_payment(payment_id: str, payload: RecurringPaymentUpdate, user: CurrentUser, store: Store) -> dict[str, Any]:
    changes = _changes(payload)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    payment = _first_or_404(
        store.update("recurring_payments", changes, _owned(str(user["id"]), payment_id)), "Recurring payment"
    )
    return {"status": "success", "data": {"payment": payment}}


@router.delete("/recurring/{payment_id}", status_code=204)
def delete_recurring_payment(payment_id: str, user: CurrentUser, store: Store) -> Response:
    _first_or_404(store.delete("recurring_payments", _owned(str(user["id"]), payment_id)), "Recurring payment")
    return Response(status_code=204)
