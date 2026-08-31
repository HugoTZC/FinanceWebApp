"""Owner-scoped dashboard routes for the FastAPI migration."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Path, Query

from auth_api import CurrentUser, Store
from transaction_api import _all_user_transactions, _enrich, _lookup_maps, _transaction_date


router = APIRouter(prefix="/dashboard", tags=["dashboard"])
COLORS = ["#4ade80", "#60a5fa", "#f87171", "#fbbf24", "#a78bfa", "#fb923c", "#34d399", "#818cf8", "#f472b6", "#fb7185", "#c084fc", "#fdba74"]
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _summary(rows: list[dict[str, Any]], year: int, month: int) -> dict[str, float]:
    selected = [row for row in rows if _transaction_date(row).year == year and _transaction_date(row).month == month]
    income = round(sum(float(row.get("amount") or 0) for row in selected if row.get("type") == "income"), 2)
    expenses = round(sum(float(row.get("amount") or 0) for row in selected if row.get("type") == "expense"), 2)
    return {"income": income, "expenses": expenses, "balance": round(income - expenses, 2)}


@router.get("/overview")
def get_overview(user: CurrentUser, store: Store) -> dict[str, Any]:
    now = datetime.now(UTC)
    previous_year, previous_month = (now.year - 1, 12) if now.month == 1 else (now.year, now.month - 1)
    rows = _all_user_transactions(store, str(user["id"]))
    current = _summary(rows, now.year, now.month) | {"year": now.year, "month": now.month}
    previous = _summary(rows, previous_year, previous_month) | {"year": previous_year, "month": previous_month}
    difference = {key: round(current[key] - previous[key], 2) for key in ("income", "expenses", "balance")}
    return {"status": "success", "data": {"currentMonth": current, "lastMonth": previous, "difference": difference}}


@router.get("/monthly/{year}")
def get_monthly(year: Annotated[int, Path(ge=1900, le=2200)], user: CurrentUser, store: Store) -> dict[str, Any]:
    rows = _all_user_transactions(store, str(user["id"]))
    data = [{"name": MONTH_NAMES[month - 1], **{key: value for key, value in _summary(rows, year, month).items() if key != "balance"}} for month in range(1, 13)]
    return {"status": "success", "data": data}


@router.get("/categories/{year}")
@router.get("/categories/{year}/{month}")
def get_categories(
    year: Annotated[int, Path(ge=1900, le=2200)],
    user: CurrentUser,
    store: Store,
    month: int | None = None,
) -> dict[str, Any]:
    if month is not None and not 1 <= month <= 12:
        raise HTTPException(status_code=422, detail="Month must be between 1 and 12")
    target_month = month or datetime.now(UTC).month
    user_id = str(user["id"])
    defaults, custom, _, _ = _lookup_maps(store, user_id)
    totals: dict[str, float] = defaultdict(float)
    for row in _all_user_transactions(store, user_id):
        row_date = _transaction_date(row)
        if row_date.year != year or row_date.month != target_month or row.get("type") != "expense":
            continue
        name = defaults.get(str(row.get("category_id"))) or custom.get(str(row.get("user_category_id"))) or "Uncategorized"
        totals[name] += float(row.get("amount") or 0)
    data = [{"name": name, "value": round(value, 2), "color": COLORS[index % len(COLORS)]} for index, (name, value) in enumerate(sorted(totals.items(), key=lambda item: item[1], reverse=True))]
    return {"status": "success", "data": data}


@router.get("/transactions/recent")
def get_recent(user: CurrentUser, store: Store, limit: Annotated[int, Query(ge=1, le=20)] = 5) -> dict[str, Any]:
    user_id = str(user["id"])
    rows = _all_user_transactions(store, user_id)[:limit]
    return {"status": "success", "data": {"transactions": _enrich(rows, store, user_id)}}
