"""Contract-compatible credit-card routes for the FastAPI migration."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Path, Query, Response
from pydantic import BaseModel, ConfigDict, Field

from auth_api import CurrentUser, DataStore, Store


router = APIRouter(prefix="/credit/cards", tags=["credit-cards"])
MONTH_NAMES = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


class CreditCardCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    last_four: str | None = Field(default=None, pattern=r"^\d{4}$")
    card_type: str | None = Field(default=None, max_length=50)
    balance: float = Field(default=0, allow_inf_nan=False)
    credit_limit: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    interest_rate: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    due_date: date | None = None
    min_payment: float | None = Field(default=None, ge=0, allow_inf_nan=False)


class CreditCardUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    last_four: str | None = Field(default=None, pattern=r"^\d{4}$")
    card_type: str | None = Field(default=None, max_length=50)
    balance: float | None = Field(default=None, allow_inf_nan=False)
    credit_limit: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    interest_rate: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    due_date: date | None = None
    min_payment: float | None = Field(default=None, ge=0, allow_inf_nan=False)


def _owned_params(user_id: str, card_id: str | None = None) -> dict[str, str]:
    params = {"user_id": f"eq.{user_id}"}
    if card_id is not None:
        params["id"] = f"eq.{card_id}"
    return params


def _first_or_404(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=404, detail="Credit card not found")
    return rows[0]


def _require_owned_card(store: DataStore, user_id: str, card_id: str) -> None:
    _first_or_404(
        store.select(
            "credit_cards", {"select": "id"} | _owned_params(user_id, card_id)
        )
    )


def _transactions(store: DataStore, user_id: str, card_id: str) -> list[dict[str, Any]]:
    return store.select(
        "transactions",
        {
            "select": "*",
            "user_id": f"eq.{user_id}",
            "credit_card_id": f"eq.{card_id}",
            "order": "transaction_date.desc",
        },
    )


def _transaction_date(transaction: dict[str, Any]) -> date:
    return date.fromisoformat(str(transaction["transaction_date"])[:10])


def _category_names(store: DataStore, user_id: str) -> tuple[dict[str, str], dict[str, str]]:
    defaults = store.select("categories", {"select": "id,name"})
    custom = store.select(
        "user_categories",
        {"select": "id,name", "user_id": f"eq.{user_id}"},
    )
    return (
        {str(row["id"]): str(row["name"]) for row in defaults},
        {str(row["id"]): str(row["name"]) for row in custom},
    )


def _category_name(
    transaction: dict[str, Any], defaults: dict[str, str], custom: dict[str, str]
) -> str:
    category_id = transaction.get("category_id")
    user_category_id = transaction.get("user_category_id")
    return (
        defaults.get(str(category_id)) if category_id else None
    ) or (
        custom.get(str(user_category_id)) if user_category_id else None
    ) or "Uncategorized"


@router.get("")
def get_credit_cards(user: CurrentUser, store: Store) -> dict[str, Any]:
    cards = store.select(
        "credit_cards",
        {"select": "*", "user_id": f"eq.{user['id']}", "order": "name.asc"},
    )
    return {"status": "success", "data": {"cards": cards}}


@router.post("", status_code=201)
def create_credit_card(
    payload: CreditCardCreate, user: CurrentUser, store: Store
) -> dict[str, Any]:
    rows = store.insert(
        "credit_cards",
        payload.model_dump(mode="json") | {"user_id": user["id"]},
    )
    return {"status": "success", "data": {"card": _first_or_404(rows)}}


@router.get("/{card_id}")
def get_credit_card(card_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    card = _first_or_404(
        store.select(
            "credit_cards", {"select": "*"} | _owned_params(str(user["id"]), card_id)
        )
    )
    return {"status": "success", "data": {"card": card}}


@router.put("/{card_id}")
def update_credit_card(
    card_id: str,
    payload: CreditCardUpdate,
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    changes = payload.model_dump(mode="json", exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    card = _first_or_404(
        store.update(
            "credit_cards", changes, _owned_params(str(user["id"]), card_id)
        )
    )
    return {"status": "success", "data": {"card": card}}


@router.delete("/{card_id}", status_code=204)
def delete_credit_card(card_id: str, user: CurrentUser, store: Store) -> Response:
    _first_or_404(
        store.delete("credit_cards", _owned_params(str(user["id"]), card_id))
    )
    return Response(status_code=204)


@router.get("/{card_id}/spending")
def get_card_spending(
    card_id: str,
    user: CurrentUser,
    store: Store,
    year: Annotated[int | None, Query(ge=1900, le=2200)] = None,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
) -> dict[str, Any]:
    user_id = str(user["id"])
    _require_owned_card(store, user_id, card_id)
    defaults, custom = _category_names(store, user_id)
    transactions = _transactions(store, user_id, card_id)
    if year is not None and month is not None:
        transactions = [
            transaction
            for transaction in transactions
            if _transaction_date(transaction).year == year
            and _transaction_date(transaction).month == month
        ]
    enriched = [
        transaction
        | {"category_name": _category_name(transaction, defaults, custom)}
        for transaction in transactions
    ]
    return {"status": "success", "data": {"transactions": enriched}}


def _spending_by_category(
    store: DataStore,
    user_id: str,
    card_id: str,
    year: int,
    month: int | None,
) -> list[dict[str, Any]]:
    defaults, custom = _category_names(store, user_id)
    totals: dict[str, float] = {}
    for transaction in _transactions(store, user_id, card_id):
        transaction_date = _transaction_date(transaction)
        if (
            transaction.get("type") != "expense"
            or transaction_date.year != year
            or (month is not None and transaction_date.month != month)
        ):
            continue
        name = _category_name(transaction, defaults, custom)
        totals[name] = totals.get(name, 0) + float(transaction.get("amount") or 0)
    return [
        {"category_name": name, "amount": round(amount, 2)}
        for name, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True)
    ]


@router.get("/{card_id}/spending/categories/{year}/{month}")
def get_card_spending_by_category_month(
    card_id: str,
    year: Annotated[int, Path(ge=1900, le=2200)],
    month: Annotated[int, Path(ge=1, le=12)],
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    user_id = str(user["id"])
    _require_owned_card(store, user_id, card_id)
    categories = _spending_by_category(store, user_id, card_id, year, month)
    return {"status": "success", "data": {"categories": categories}}


@router.get("/{card_id}/spending/categories/{year}")
def get_card_spending_by_category_year(
    card_id: str,
    year: Annotated[int, Path(ge=1900, le=2200)],
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    user_id = str(user["id"])
    _require_owned_card(store, user_id, card_id)
    categories = _spending_by_category(store, user_id, card_id, year, None)
    return {"status": "success", "data": {"categories": categories}}


@router.get("/{card_id}/spending/monthly/{year}")
def get_card_monthly_spending(
    card_id: str,
    year: Annotated[int, Path(ge=1900, le=2200)],
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    user_id = str(user["id"])
    _require_owned_card(store, user_id, card_id)
    totals = [0.0] * 12
    for transaction in _transactions(store, user_id, card_id):
        transaction_date = _transaction_date(transaction)
        if transaction.get("type") == "expense" and transaction_date.year == year:
            totals[transaction_date.month - 1] += float(transaction.get("amount") or 0)
    spending = [
        {"month": month, "amount": round(amount, 2)}
        for month, amount in zip(MONTH_NAMES, totals, strict=True)
    ]
    return {"status": "success", "data": {"spending": spending}}
