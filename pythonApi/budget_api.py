"""Contract-compatible budget routes for the FastAPI migration."""

from __future__ import annotations

from calendar import monthrange
from datetime import UTC, date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Path, Query, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator

from auth_api import CurrentUser, DataStore, Store


router = APIRouter(prefix="/budgets", tags=["budgets"])


class BudgetCategoryInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_id: str | None = None
    user_category_id: str | None = None
    amount: float = Field(ge=0, allow_inf_nan=False)

    @model_validator(mode="after")
    def exactly_one_category(self) -> "BudgetCategoryInput":
        if bool(self.category_id) == bool(self.user_category_id):
            raise ValueError("Exactly one category ID is required")
        return self


class BudgetUpsert(BaseModel):
    year: int = Field(ge=1900, le=2200)
    month: int = Field(ge=1, le=12)
    categories: list[BudgetCategoryInput] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def unique_categories(self) -> "BudgetUpsert":
        keys = [item.category_id or item.user_category_id for item in self.categories]
        if len(keys) != len(set(keys)):
            raise ValueError("Duplicate categories found in request")
        return self


def _first_or_404(rows: list[dict[str, Any]], resource: str) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=404, detail=f"{resource} not found")
    return rows[0]


def _period(store: DataStore, user_id: str, year: int, month: int) -> dict[str, Any] | None:
    rows = store.select(
        "budget_periods",
        {
            "select": "*",
            "user_id": f"eq.{user_id}",
            "year": f"eq.{year}",
            "month": f"eq.{month}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def _create_period(store: DataStore, user_id: str, year: int, month: int) -> dict[str, Any]:
    last_day = monthrange(year, month)[1]
    return _first_or_404(
        store.insert(
            "budget_periods",
            {
                "user_id": user_id,
                "year": year,
                "month": month,
                "start_date": date(year, month, 1).isoformat(),
                "end_date": date(year, month, last_day).isoformat(),
            },
        ),
        "Budget period",
    )


def _period_or_create(store: DataStore, user_id: str, year: int, month: int) -> dict[str, Any]:
    return _period(store, user_id, year, month) or _create_period(store, user_id, year, month)


def _category_maps(store: DataStore, user_id: str) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    defaults = {
        str(row["id"]): row
        for row in store.select("categories", {"select": "id,name,type,category_group,icon,color"})
    }
    custom = {
        str(row["id"]): row
        for row in store.select(
            "user_categories",
            {
                "select": "id,name,type,category_group,icon,color",
                "user_id": f"eq.{user_id}",
            },
        )
    }
    return defaults, custom


def _validate_category(store: DataStore, user_id: str, item: BudgetCategoryInput) -> None:
    table = "categories" if item.category_id else "user_categories"
    category_id = item.category_id or item.user_category_id
    params = {"select": "id,type", "id": f"eq.{category_id}", "limit": "1"}
    if table == "user_categories":
        params["user_id"] = f"eq.{user_id}"
    rows = store.select(table, params)
    if not rows or rows[0].get("type") != "expense":
        raise HTTPException(status_code=400, detail="Invalid expense category")


def _budget_categories(store: DataStore, user_id: str, period_id: str) -> list[dict[str, Any]]:
    defaults, custom = _category_maps(store, user_id)
    result = []
    for row in store.select(
        "budget_categories",
        {"select": "*", "budget_period_id": f"eq.{period_id}", "order": "created_at.asc"},
    ):
        category = defaults.get(str(row.get("category_id"))) if row.get("category_id") else None
        user_category = custom.get(str(row.get("user_category_id"))) if row.get("user_category_id") else None
        if row.get("user_category_id") and not user_category:
            continue
        result.append(
            row
            | {
                "category_name": category.get("name") if category else None,
                "category_type": category.get("type") if category else None,
                "category_group": category.get("category_group") if category else None,
                "icon": category.get("icon") if category else None,
                "color": category.get("color") if category else None,
                "user_category_name": user_category.get("name") if user_category else None,
                "user_category_type": user_category.get("type") if user_category else None,
                "user_category_group": user_category.get("category_group") if user_category else None,
                "user_category_icon": user_category.get("icon") if user_category else None,
                "user_category_color": user_category.get("color") if user_category else None,
            }
        )
    return result


def _monthly_expenses(store: DataStore, user_id: str, year: int, month: int) -> list[dict[str, Any]]:
    rows = store.select(
        "transactions",
        {"select": "category_id,user_category_id,amount,transaction_date,type", "user_id": f"eq.{user_id}"},
    )
    return [
        row
        for row in rows
        if row.get("type") == "expense"
        and str(row.get("transaction_date", ""))[:7] == f"{year:04d}-{month:02d}"
    ]


def _spending_by_category(store: DataStore, user_id: str, year: int, month: int) -> dict[str, float]:
    totals: dict[str, float] = {}
    for row in _monthly_expenses(store, user_id, year, month):
        category_id = row.get("category_id") or row.get("user_category_id")
        if category_id:
            totals[str(category_id)] = totals.get(str(category_id), 0.0) + float(row["amount"])
    return totals


@router.post("", status_code=201)
def create_or_update_budget(payload: BudgetUpsert, user: CurrentUser, store: Store) -> dict[str, Any]:
    current_year = datetime.now(UTC).year
    if payload.year not in {current_year, current_year + 1}:
        raise HTTPException(status_code=400, detail="Budgets may only be set for the current or next year")
    user_id = str(user["id"])
    period = _period_or_create(store, user_id, payload.year, payload.month)
    saved = []
    for item in payload.categories:
        _validate_category(store, user_id, item)
        params = {"select": "*", "budget_period_id": f"eq.{period['id']}"}
        field = "category_id" if item.category_id else "user_category_id"
        category_id = item.category_id or item.user_category_id
        params[field] = f"eq.{category_id}"
        existing = store.select("budget_categories", params)
        if existing:
            rows = store.update(
                "budget_categories", {"amount": item.amount}, {"id": f"eq.{existing[0]['id']}", "budget_period_id": f"eq.{period['id']}"}
            )
        else:
            rows = store.insert(
                "budget_categories",
                {"budget_period_id": period["id"], "category_id": item.category_id, "user_category_id": item.user_category_id, "amount": item.amount},
            )
        saved.append(_first_or_404(rows, "Budget category"))
    return {"status": "success", "data": {"budget": {"period": period, "categories": saved}}}


@router.get("/alerts")
def get_budget_alerts(user: CurrentUser, store: Store) -> dict[str, Any]:
    user_id = str(user["id"])
    today = datetime.now(UTC).date()
    period = _period(store, user_id, today.year, today.month)
    if not period:
        return {"status": "success", "data": {"alerts": []}}
    categories = _budget_categories(store, user_id, str(period["id"]))
    spending = _spending_by_category(store, user_id, today.year, today.month)
    existing = {
        str(row["budget_category_id"]): row
        for row in store.select("budget_alerts", {"select": "*", "user_id": f"eq.{user_id}"})
        if row.get("budget_category_id")
    }
    alerts = []
    for category in categories:
        category_id = str(category.get("category_id") or category.get("user_category_id"))
        amount = float(category.get("amount") or 0)
        spent = spending.get(category_id, 0.0)
        if amount <= 0 or spent < amount * 0.75:
            continue
        persisted = existing.get(str(category["id"]))
        if persisted and persisted.get("is_read"):
            continue
        if not persisted:
            persisted = _first_or_404(
                store.insert("budget_alerts", {"user_id": user_id, "budget_category_id": category["id"], "is_read": False}),
                "Budget alert",
            )
        percentage = round(spent / amount * 100, 1)
        alerts.append(
            persisted
            | {
                "budget_period_id": period["id"], "year": today.year, "month": today.month,
                "category_name": category.get("category_name") or category.get("user_category_name") or "Unknown",
                "budget_amount": amount, "spent_amount": round(spent, 2),
                "alert_level": "HIGH" if percentage >= 90 else "MEDIUM", "threshold_percentage": percentage,
            }
        )
    alerts.sort(key=lambda item: float(item["threshold_percentage"]), reverse=True)
    return {"status": "success", "data": {"alerts": alerts}}


@router.patch("/alerts/{alert_id}")
def mark_budget_alert_as_read(alert_id: str, user: CurrentUser, store: Store) -> dict[str, str]:
    rows = store.update(
        "budget_alerts", {"is_read": True}, {"id": f"eq.{alert_id}", "user_id": f"eq.{user['id']}"}
    )
    _first_or_404(rows, "Budget alert")
    return {"status": "success", "message": "Budget alert marked as read"}


@router.get("/categories/{category_id}/spending")
def get_budget_category_spending(
    category_id: str,
    user: CurrentUser,
    store: Store,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
    year: Annotated[int | None, Query(ge=1900, le=2200)] = None,
) -> dict[str, Any]:
    today = datetime.now(UTC).date()
    selected_year, selected_month = year or today.year, month or today.month
    user_id = str(user["id"])
    period = _period(store, user_id, selected_year, selected_month)
    if not period:
        raise HTTPException(status_code=404, detail="Budget category not found")
    category = _first_or_404(
        store.select("budget_categories", {"select": "*", "id": f"eq.{category_id}", "budget_period_id": f"eq.{period['id']}"}),
        "Budget category",
    )
    selected_id = str(category.get("category_id") or category.get("user_category_id"))
    spent = _spending_by_category(store, user_id, selected_year, selected_month).get(selected_id, 0.0)
    return {"status": "success", "data": {"spending": round(spent, 2)}}


@router.delete("/categories/{category_id}", status_code=204)
def delete_budget_category(category_id: str, user: CurrentUser, store: Store) -> Response:
    category = _first_or_404(
        store.select("budget_categories", {"select": "id,budget_period_id", "id": f"eq.{category_id}"}),
        "Budget category",
    )
    _first_or_404(
        store.select("budget_periods", {"select": "id", "id": f"eq.{category['budget_period_id']}", "user_id": f"eq.{user['id']}"}),
        "Budget category",
    )
    _first_or_404(
        store.delete("budget_categories", {"id": f"eq.{category_id}", "budget_period_id": f"eq.{category['budget_period_id']}"}),
        "Budget category",
    )
    return Response(status_code=204)


@router.get("/{year}/{month}")
def get_budget(
    year: Annotated[int, Path(ge=1900, le=2200)],
    month: Annotated[int, Path(ge=1, le=12)],
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    user_id = str(user["id"])
    period = _period_or_create(store, user_id, year, month)
    categories = _budget_categories(store, user_id, str(period["id"]))
    spending = _spending_by_category(store, user_id, year, month)
    enriched = []
    for category in categories:
        category_id = str(category.get("category_id") or category.get("user_category_id"))
        spent = round(spending.get(category_id, 0.0), 2)
        enriched.append(category | {"spent": spent, "remaining": round(float(category.get("amount") or 0) - spent, 2)})
    return {"status": "success", "data": {"budget": {"period": period, "categories": enriched}}}
