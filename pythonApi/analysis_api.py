"""Owner-scoped financial analysis routes for the FastAPI migration."""

from __future__ import annotations

from calendar import month_abbr
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Query

from auth_api import CurrentUser, Store
from transaction_api import _all_user_transactions, _transaction_date


router = APIRouter(prefix="/analysis", tags=["analysis"])


def _owned(user_id: str) -> dict[str, str]:
    return {"user_id": f"eq.{user_id}"}


def _amount(value: Any) -> float:
    return round(float(value or 0), 2)


def _today() -> date:
    return datetime.now(UTC).date()


def _month_offset(anchor: date, offset: int) -> tuple[int, int]:
    absolute = anchor.year * 12 + anchor.month - 1 + offset
    return absolute // 12, absolute % 12 + 1


@router.get("/budget")
def get_budget_analysis(
    user: CurrentUser,
    store: Store,
    year: Annotated[int | None, Query(ge=1900, le=2200)] = None,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
) -> dict[str, Any]:
    today = _today()
    target_year, target_month = year or today.year, month or today.month
    user_id = str(user["id"])
    periods = store.select(
        "budget_periods",
        {"select": "*", "year": f"eq.{target_year}", "month": f"eq.{target_month}", "limit": "1"} | _owned(user_id),
    )
    if not periods:
        return {"success": True, "data": {"budget_period": None, "categories": [], "total_budget": 0.0, "total_spent": 0.0, "remaining": 0.0}}

    period = periods[0]
    categories = store.select("budget_categories", {"select": "*", "budget_period_id": f"eq.{period['id']}"})
    start, end = date.fromisoformat(str(period["start_date"])[:10]), date.fromisoformat(str(period["end_date"])[:10])
    expenses = [
        row for row in _all_user_transactions(store, user_id)
        if row.get("type") == "expense" and start <= _transaction_date(row) <= end
    ]
    analyzed = []
    for category in categories:
        spent = sum(
            _amount(row.get("amount")) for row in expenses
            if (category.get("category_id") and row.get("category_id") == category.get("category_id"))
            or (category.get("user_category_id") and row.get("user_category_id") == category.get("user_category_id"))
        )
        budgeted = _amount(category.get("amount"))
        analyzed.append(category | {"spent": round(spent, 2), "remaining": round(budgeted - spent, 2)})
    total_budget = round(sum(_amount(row.get("amount")) for row in categories), 2)
    total_spent = round(sum(row["spent"] for row in analyzed), 2)
    return {"success": True, "data": {"budget_period": period, "categories": analyzed, "total_budget": total_budget, "total_spent": total_spent, "remaining": round(total_budget - total_spent, 2)}}


@router.get("/weekly")
def get_weekly_analysis(
    user: CurrentUser,
    store: Store,
    weeks_back: Annotated[int, Query(ge=1, le=52)] = 4,
) -> dict[str, Any]:
    end = _today()
    rows = _all_user_transactions(store, str(user["id"]))
    weeks = []
    for index in range(weeks_back - 1, -1, -1):
        week_end = end - timedelta(days=index * 7)
        week_start = week_end - timedelta(days=7)
        selected = [row for row in rows if week_start < _transaction_date(row) <= week_end]
        income = round(sum(_amount(row.get("amount")) for row in selected if row.get("type") == "income"), 2)
        expenses = round(sum(_amount(row.get("amount")) for row in selected if row.get("type") == "expense"), 2)
        weeks.append({"week": f"{week_start.isoformat()} - {week_end.isoformat()}", "week_start": week_start.isoformat(), "week_end": week_end.isoformat(), "income": income, "expenses": expenses, "net": round(income - expenses, 2), "transaction_count": len(selected)})
    return {"success": True, "data": weeks}


@router.get("/due-dates")
def get_upcoming_due_dates(
    user: CurrentUser,
    store: Store,
    days: Annotated[int, Query(ge=0, le=365)] = 7,
) -> dict[str, Any]:
    today = _today()
    user_id = str(user["id"])
    sources = [
        ("recurring_payments", "recurring_payment", "amount"),
        ("credit_cards", "credit_card", "min_payment"),
        ("loans", "loan", "monthly_payment"),
    ]
    due_dates = []
    for table, item_type, amount_field in sources:
        for row in store.select(table, {"select": "*"} | _owned(user_id)):
            if not row.get("due_date"):
                continue
            due = date.fromisoformat(str(row["due_date"])[:10])
            difference = (due - today).days
            if 0 <= difference <= days:
                due_dates.append({"id": row["id"], "name": row["name"], "type": item_type, "amount": _amount(row.get(amount_field)), "due_date": str(row["due_date"])[:10], "days_until_due": difference})
    due_dates.sort(key=lambda item: (item["days_until_due"], item["name"]))
    return {"success": True, "count": len(due_dates), "data": due_dates}


@router.get("/obligations")
def get_monthly_obligations(user: CurrentUser, store: Store) -> dict[str, Any]:
    user_id = str(user["id"])
    recurring = sum(_amount(row.get("amount")) for row in store.select("recurring_payments", {"select": "amount"} | _owned(user_id)))
    cards = sum(_amount(row.get("min_payment")) for row in store.select("credit_cards", {"select": "min_payment"} | _owned(user_id)))
    loans = sum(_amount(row.get("monthly_payment")) for row in store.select("loans", {"select": "monthly_payment"} | _owned(user_id)))
    data = {"recurring_payments_total": round(recurring, 2), "credit_cards_total": round(cards, 2), "loans_total": round(loans, 2), "total": round(recurring + cards + loans, 2)}
    return {"success": True, "data": data}


@router.get("/monthly")
def get_monthly_income_and_expenses(
    user: CurrentUser,
    store: Store,
    months: Annotated[int, Query(ge=1, le=36)] = 6,
) -> dict[str, Any]:
    today = _today()
    rows = _all_user_transactions(store, str(user["id"]))
    data = []
    for offset in range(-(months - 1), 1):
        year, month = _month_offset(today, offset)
        selected = [row for row in rows if _transaction_date(row).year == year and _transaction_date(row).month == month]
        data.append({"month": month_abbr[month], "year": year, "income": round(sum(_amount(row.get("amount")) for row in selected if row.get("type") == "income"), 2), "expenses": round(sum(_amount(row.get("amount")) for row in selected if row.get("type") == "expense"), 2)})
    return {"success": True, "data": data}
