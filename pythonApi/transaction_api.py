"""Contract-compatible transaction routes for the FastAPI migration."""

from __future__ import annotations

import math
from datetime import date
from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException, Path, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from auth_api import CurrentUser, DataStore, Store


router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0, allow_inf_nan=False)
    transaction_date: date
    type: Literal["income", "expense", "credit-payment", "savings-deposit"]
    category: str | None = None
    payment_method: str | None = "cash"
    bank_account_id: str | None = None
    credit_card_id: str | None = None
    comment: str | None = None
    savings_goal_id: str | None = None
    recurring_payment_id: str | None = None

    @field_validator("transaction_date", mode="before")
    @classmethod
    def accept_iso_datetime(cls, value: Any) -> Any:
        return str(value)[:10] if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_transaction_kind(self) -> "TransactionCreate":
        if self.type in {"income", "expense"} and not self.category:
            raise ValueError("A category is required for income and expense transactions")
        if self.type == "credit-payment" and not self.credit_card_id:
            raise ValueError("A credit card is required for a credit payment")
        if self.type == "savings-deposit" and not (self.savings_goal_id or self.recurring_payment_id):
            raise ValueError("A savings destination is required for a savings deposit")
        return self


class TransactionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=255)
    amount: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    transaction_date: date | None = None
    type: Literal["income", "expense", "credit-payment", "savings-deposit"] | None = None
    category: str | None = None
    category_id: str | None = None
    user_category_id: str | None = None
    payment_method: str | None = None
    bank_account_id: str | None = None
    credit_card_id: str | None = None
    comment: str | None = None
    savings_goal_id: str | None = None
    recurring_payment_id: str | None = None

    @field_validator("transaction_date", mode="before")
    @classmethod
    def accept_iso_datetime(cls, value: Any) -> Any:
        return str(value)[:10] if isinstance(value, str) else value


def _owned(user_id: str, item_id: str | None = None) -> dict[str, str]:
    params = {"user_id": f"eq.{user_id}"}
    if item_id is not None:
        params["id"] = f"eq.{item_id}"
    return params


def _first_or_404(rows: list[dict[str, Any]], resource: str) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=404, detail=f"{resource} not found")
    return rows[0]


def _require_owned(store: DataStore, table: str, user_id: str, item_id: str, resource: str) -> None:
    _first_or_404(
        store.select(table, {"select": "id"} | _owned(user_id, item_id)), resource
    )


def _resolve_category(store: DataStore, user_id: str, category_id: str) -> tuple[str | None, str | None]:
    default = store.select(
        "categories", {"select": "id", "id": f"eq.{category_id}", "limit": "1"}
    )
    if default:
        return category_id, None
    custom = store.select(
        "user_categories",
        {"select": "id"} | _owned(user_id, category_id) | {"limit": "1"},
    )
    if custom:
        return None, category_id
    raise HTTPException(status_code=400, detail="Invalid category ID")


def _normalize_payment(
    store: DataStore,
    user_id: str,
    transaction_type: str,
    payment_method: str | None,
    bank_account_id: str | None,
    credit_card_id: str | None,
) -> tuple[str, str | None, str | None]:
    if transaction_type == "income":
        return "cash", None, None
    if transaction_type == "credit-payment":
        if not credit_card_id:
            raise HTTPException(status_code=400, detail="Credit card ID is required for a credit payment")
        _require_owned(store, "credit_cards", user_id, credit_card_id, "Credit card")
        return "credit_card_payment", None, credit_card_id
    if transaction_type == "savings-deposit":
        return "cash", None, None
    method = (payment_method or "cash").replace("-", "_")
    if method not in {"cash", "bank_account", "credit_card", "credit_card_payment"}:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    if method == "credit_card_payment":
        if not credit_card_id:
            raise HTTPException(status_code=400, detail="Credit card ID is required for a credit payment")
        _require_owned(store, "credit_cards", user_id, credit_card_id, "Credit card")
        return method, None, credit_card_id
    if method == "bank_account":
        if not bank_account_id:
            raise HTTPException(status_code=400, detail="Bank account ID is required when payment method is bank_account")
        _require_owned(store, "bank_accounts", user_id, bank_account_id, "Bank account")
        return method, bank_account_id, None
    if method == "credit_card":
        if not credit_card_id:
            raise HTTPException(status_code=400, detail="Credit card ID is required when payment method is credit_card")
        _require_owned(store, "credit_cards", user_id, credit_card_id, "Credit card")
        return method, None, credit_card_id
    return method, None, None


def _validate_optional_ownership(store: DataStore, user_id: str, payload: dict[str, Any]) -> None:
    if payload.get("savings_goal_id"):
        _require_owned(store, "savings_goals", user_id, payload["savings_goal_id"], "Savings goal")
    if payload.get("recurring_payment_id"):
        _require_owned(store, "recurring_payments", user_id, payload["recurring_payment_id"], "Recurring payment")


def _balance_effects(transaction: dict[str, Any]) -> list[tuple[str, str, str, float]]:
    amount = float(transaction["amount"])
    effects: list[tuple[str, str, str, float]] = []
    if transaction.get("credit_card_id") and transaction.get("payment_method") == "credit_card_payment":
        effects.append(("credit_cards", str(transaction["credit_card_id"]), "balance", -amount))
    elif transaction.get("credit_card_id") and transaction.get("type") == "expense":
        effects.append(("credit_cards", str(transaction["credit_card_id"]), "balance", amount))
    if transaction.get("bank_account_id"):
        delta = amount if transaction.get("type") == "income" else -amount
        effects.append(("bank_accounts", str(transaction["bank_account_id"]), "balance", delta))
    if transaction.get("savings_goal_id") and transaction.get("type") == "savings-deposit":
        effects.append(("savings_goals", str(transaction["savings_goal_id"]), "current_amount", amount))
    if transaction.get("recurring_payment_id") and transaction.get("type") == "expense":
        effects.append(("recurring_payments", str(transaction["recurring_payment_id"]), "current_amount", amount))
    return effects


def _apply_balance_effects(
    store: DataStore, user_id: str, transaction: dict[str, Any], multiplier: int = 1
) -> None:
    for table, item_id, field, delta in _balance_effects(transaction):
        rows = store.select(table, {"select": f"id,{field}"} | _owned(user_id, item_id))
        item = _first_or_404(rows, table.replace("_", " ").rstrip("s").title())
        store.update(
            table,
            {field: round(float(item.get(field) or 0) + delta * multiplier, 2)},
            _owned(user_id, item_id),
        )


def _lookup_maps(store: DataStore, user_id: str) -> tuple[dict[str, str], ...]:
    def names(table: str, owned: bool) -> dict[str, str]:
        params = {"select": "id,name"}
        if owned:
            params["user_id"] = f"eq.{user_id}"
        return {str(row["id"]): str(row["name"]) for row in store.select(table, params)}

    return (
        names("categories", False),
        names("user_categories", True),
        names("bank_accounts", True),
        names("credit_cards", True),
    )


def _enrich(rows: list[dict[str, Any]], store: DataStore, user_id: str) -> list[dict[str, Any]]:
    if not rows:
        return []
    defaults, custom, accounts, cards = _lookup_maps(store, user_id)
    enriched = []
    for row in rows:
        category_id = row.get("category_id")
        user_category_id = row.get("user_category_id")
        default_name = defaults.get(str(category_id)) if category_id else None
        custom_name = custom.get(str(user_category_id)) if user_category_id else None
        display_type = (
            "credit-payment"
            if row.get("payment_method") == "credit_card_payment"
            else row.get("type")
        )
        transfer_name = {
            "credit-payment": "Credit Card Payment",
            "savings-deposit": "Savings Deposit",
        }.get(str(display_type))
        enriched.append(
            row
            | {
                "date": row.get("transaction_date"),
                "description": row.get("title"),
                "type": display_type,
                "category": default_name or custom_name or transfer_name or "Other",
                "category_name": default_name,
                "user_category_name": custom_name,
                "bank_account_name": accounts.get(str(row.get("bank_account_id"))),
                "credit_card_name": cards.get(str(row.get("credit_card_id"))),
            }
        )
    return enriched


def _transaction_date(row: dict[str, Any]) -> date:
    return date.fromisoformat(str(row["transaction_date"])[:10])


def _all_user_transactions(store: DataStore, user_id: str) -> list[dict[str, Any]]:
    return store.select(
        "transactions",
        {"select": "*", "user_id": f"eq.{user_id}", "order": "transaction_date.desc"},
    )


@router.get("")
def get_transactions(
    user: CurrentUser,
    store: Store,
    transaction_type: Annotated[Literal["income", "expense"] | None, Query(alias="type")] = None,
    category_id: str | None = None,
    category: str | None = None,
    user_category_id: str | None = None,
    payment_method: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    year: Annotated[int | None, Query(ge=1900, le=2200)] = None,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
    week: Annotated[int | None, Query(ge=1, le=53)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> dict[str, Any]:
    user_id = str(user["id"])
    selected_category = category_id or category
    rows = []
    for row in _all_user_transactions(store, user_id):
        row_date = _transaction_date(row)
        iso_week = row_date.isocalendar().week
        if (
            (transaction_type and row.get("type") != transaction_type)
            or (
                selected_category
                and row.get("category_id") != selected_category
                and row.get("user_category_id") != selected_category
            )
            or (user_category_id and row.get("user_category_id") != user_category_id)
            or (payment_method and row.get("payment_method") != payment_method.replace("-", "_"))
            or (start_date and row_date < start_date)
            or (end_date and row_date > end_date)
            or (year and row_date.year != year)
            or (month and row_date.month != month)
            or (week and iso_week != week)
            or (search and search.casefold() not in str(row.get("title", "")).casefold())
        ):
            continue
        rows.append(row)
    total = len(rows)
    offset = (page - 1) * limit
    selected = _enrich(rows[offset : offset + limit], store, user_id)
    return {
        "status": "success",
        "data": {
            "transactions": selected,
            "pagination": {"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit)},
        },
    }


@router.post("", status_code=201)
def create_transaction(
    payload: TransactionCreate, user: CurrentUser, store: Store
) -> dict[str, Any]:
    user_id = str(user["id"])
    category_id, user_category_id = (
        _resolve_category(store, user_id, payload.category)
        if payload.category
        else (None, None)
    )
    payment_method, bank_account_id, credit_card_id = _normalize_payment(
        store,
        user_id,
        payload.type,
        payload.payment_method,
        payload.bank_account_id,
        payload.credit_card_id,
    )
    data = payload.model_dump(mode="json", exclude={"category"}) | {
        "user_id": user_id,
        "type": "expense" if payload.type == "credit-payment" else payload.type,
        "category_id": category_id,
        "user_category_id": user_category_id,
        "payment_method": payment_method,
        "bank_account_id": bank_account_id,
        "credit_card_id": credit_card_id,
        "is_recurring": False,
        "recurring_transaction_id": None,
    }
    _validate_optional_ownership(store, user_id, data)
    transaction = _first_or_404(store.insert("transactions", data), "Transaction")
    _apply_balance_effects(store, user_id, transaction)
    return {"status": "success", "data": {"transaction": transaction}}


@router.get("/years")
def get_transaction_years(user: CurrentUser, store: Store) -> dict[str, Any]:
    years = sorted(
        {_transaction_date(row).year for row in _all_user_transactions(store, str(user["id"]))},
        reverse=True,
    )
    if not years:
        current = date.today().year
        years = [current, current - 1, current - 2]
    return {"status": "success", "data": {"years": [{"year": year} for year in years]}}


@router.get("/summary/{year}/{month}")
def get_monthly_summary(
    year: Annotated[int, Path(ge=1900, le=2200)],
    month: Annotated[int, Path(ge=1, le=12)],
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    income = expenses = 0.0
    for row in _all_user_transactions(store, str(user["id"])):
        row_date = _transaction_date(row)
        if row_date.year == year and row_date.month == month and row.get("payment_method") != "credit_card_payment":
            if row.get("type") == "income":
                income += float(row["amount"])
            elif row.get("type") == "expense":
                expenses += float(row["amount"])
    summary = {"total_income": round(income, 2), "total_expenses": round(expenses, 2), "net_flow": round(income - expenses, 2)}
    return {"status": "success", "data": {"summary": summary}}


@router.get("/categories/{year}/{month}")
def get_category_breakdown(
    year: Annotated[int, Path(ge=1900, le=2200)],
    month: Annotated[int, Path(ge=1, le=12)],
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    user_id = str(user["id"])
    defaults, custom, _, _ = _lookup_maps(store, user_id)
    category_types = {
        str(row["id"]): str(row["type"])
        for row in store.select("categories", {"select": "id,type"})
    } | {
        str(row["id"]): str(row["type"])
        for row in store.select("user_categories", {"select": "id,type", "user_id": f"eq.{user_id}"})
    }
    totals: dict[str, dict[str, Any]] = {}
    for row in _all_user_transactions(store, user_id):
        row_date = _transaction_date(row)
        if row_date.year != year or row_date.month != month:
            continue
        selected_id = row.get("category_id") or row.get("user_category_id")
        name = defaults.get(str(selected_id)) or custom.get(str(selected_id))
        if not name:
            continue
        item = totals.setdefault(name, {"category_name": name, "category_type": category_types.get(str(selected_id)), "total_amount": 0.0, "transaction_count": 0})
        item["total_amount"] += float(row["amount"])
        item["transaction_count"] += 1
    categories = sorted(totals.values(), key=lambda item: item["total_amount"], reverse=True)
    for item in categories:
        item["total_amount"] = round(item["total_amount"], 2)
    return {"status": "success", "data": {"categories": categories}}


@router.get("/card/{card_id}")
def get_transactions_by_card(
    card_id: str,
    user: CurrentUser,
    store: Store,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> dict[str, Any]:
    user_id = str(user["id"])
    _require_owned(store, "credit_cards", user_id, card_id, "Credit card")
    rows = [row for row in _all_user_transactions(store, user_id) if row.get("credit_card_id") == card_id]
    total = len(rows)
    offset = (page - 1) * limit
    return {"status": "success", "data": {"transactions": _enrich(rows[offset : offset + limit], store, user_id), "pagination": {"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit)}}}


@router.get("/{transaction_id}")
def get_transaction(transaction_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    user_id = str(user["id"])
    row = _first_or_404(
        store.select("transactions", {"select": "*"} | _owned(user_id, transaction_id)),
        "Transaction",
    )
    return {"status": "success", "data": {"transaction": _enrich([row], store, user_id)[0]}}


@router.patch("/{transaction_id}")
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    user_id = str(user["id"])
    existing = _first_or_404(
        store.select("transactions", {"select": "*"} | _owned(user_id, transaction_id)),
        "Transaction",
    )
    changes = payload.model_dump(mode="json", exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    requested_category = changes.pop("category", None)
    if requested_category:
        changes["category_id"], changes["user_category_id"] = _resolve_category(store, user_id, requested_category)
    elif "category_id" in changes or "user_category_id" in changes:
        selected = changes.get("category_id") or changes.get("user_category_id")
        if not selected:
            raise HTTPException(status_code=400, detail="A category is required")
        changes["category_id"], changes["user_category_id"] = _resolve_category(store, user_id, selected)
    combined = existing | changes
    requested_type = (
        "credit-payment"
        if combined.get("payment_method") == "credit_card_payment"
        else combined["type"]
    )
    if requested_type in {"credit-payment", "savings-deposit"}:
        changes |= {"category_id": None, "user_category_id": None}
        combined |= {"category_id": None, "user_category_id": None}
    elif not (combined.get("category_id") or combined.get("user_category_id")):
        raise HTTPException(status_code=400, detail="A category is required")
    method, bank_id, card_id = _normalize_payment(
        store,
        user_id,
        str(requested_type),
        combined.get("payment_method"),
        combined.get("bank_account_id"),
        combined.get("credit_card_id"),
    )
    changes |= {
        "type": "expense" if requested_type == "credit-payment" else requested_type,
        "payment_method": method,
        "bank_account_id": bank_id,
        "credit_card_id": card_id,
    }
    _validate_optional_ownership(store, user_id, combined)
    _apply_balance_effects(store, user_id, existing, multiplier=-1)
    updated = _first_or_404(
        store.update("transactions", changes, _owned(user_id, transaction_id)),
        "Transaction",
    )
    _apply_balance_effects(store, user_id, updated)
    return {"status": "success", "data": {"transaction": updated}}


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: str, user: CurrentUser, store: Store) -> Response:
    user_id = str(user["id"])
    existing = _first_or_404(
        store.select("transactions", {"select": "*"} | _owned(user_id, transaction_id)),
        "Transaction",
    )
    _apply_balance_effects(store, user_id, existing, multiplier=-1)
    _first_or_404(
        store.delete("transactions", _owned(user_id, transaction_id)),
        "Transaction",
    )
    return Response(status_code=204)
