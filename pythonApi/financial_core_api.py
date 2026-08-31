"""Contract-compatible account and category routes for the FastAPI migration."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field

from auth_api import CurrentUser, DataStore, Store


router = APIRouter(tags=["financial-core"])


class BankAccountCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    account_number: str | None = Field(default=None, max_length=50)
    account_type: str = Field(min_length=1, max_length=50)
    balance: float = Field(default=0, allow_inf_nan=False)
    is_default: bool = False


class BankAccountUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    account_number: str | None = Field(default=None, max_length=50)
    account_type: str | None = Field(default=None, min_length=1, max_length=50)
    balance: float | None = Field(default=None, allow_inf_nan=False)
    is_default: bool | None = None


class UserCategoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    type: Literal["income", "expense"]
    category_group: str | None = Field(default=None, max_length=100)
    icon: str | None = Field(default=None, max_length=100)
    color: str | None = Field(default=None, max_length=20)


class UserCategoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: Literal["income", "expense"] | None = None
    category_group: str | None = Field(default=None, max_length=100)
    icon: str | None = Field(default=None, max_length=100)
    color: str | None = Field(default=None, max_length=20)


def _owned_params(user_id: str, item_id: str | None = None) -> dict[str, str]:
    params = {"user_id": f"eq.{user_id}"}
    if item_id is not None:
        params["id"] = f"eq.{item_id}"
    return params


def _changes(payload: BaseModel) -> dict[str, Any]:
    return payload.model_dump(mode="json", exclude_unset=True)


def _first_or_404(rows: list[dict[str, Any]], resource: str) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=404, detail=f"{resource} not found")
    return rows[0]


@router.get("/accounts")
def get_accounts(user: CurrentUser, store: Store) -> dict[str, Any]:
    accounts = store.select(
        "bank_accounts",
        {
            "select": "*",
            "user_id": f"eq.{user['id']}",
            "order": "is_default.desc,name.asc",
        },
    )
    return {"status": "success", "data": {"accounts": accounts}}


@router.post("/accounts", status_code=201)
def create_account(
    payload: BankAccountCreate, user: CurrentUser, store: Store
) -> dict[str, Any]:
    account = _first_or_404(
        store.insert("bank_accounts", _changes(payload) | {"user_id": user["id"]}),
        "Bank account",
    )
    if payload.is_default:
        store.update(
            "bank_accounts",
            {"is_default": False},
            {"user_id": f"eq.{user['id']}", "id": f"neq.{account['id']}"},
        )
    return {"status": "success", "data": {"account": account}}


@router.get("/accounts/{account_id}")
def get_account(account_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    account = _first_or_404(
        store.select(
            "bank_accounts", {"select": "*"} | _owned_params(str(user["id"]), account_id)
        ),
        "Bank account",
    )
    return {"status": "success", "data": {"account": account}}


@router.patch("/accounts/{account_id}")
def update_account(
    account_id: str,
    payload: BankAccountUpdate,
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    changes = _changes(payload)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    account = _first_or_404(
        store.update(
            "bank_accounts", changes, _owned_params(str(user["id"]), account_id)
        ),
        "Bank account",
    )
    if changes.get("is_default") is True:
        store.update(
            "bank_accounts",
            {"is_default": False},
            {"user_id": f"eq.{user['id']}", "id": f"neq.{account_id}"},
        )
    return {"status": "success", "data": {"account": account}}


@router.delete("/accounts/{account_id}", status_code=204)
def delete_account(account_id: str, user: CurrentUser, store: Store) -> Response:
    _first_or_404(
        store.delete("bank_accounts", _owned_params(str(user["id"]), account_id)),
        "Bank account",
    )
    return Response(status_code=204)


def _previous_months(count: int, today: date | None = None) -> list[str]:
    current = today or date.today()
    year, month = current.year, current.month
    result: list[str] = []
    for _ in range(count):
        result.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(result))


@router.get("/accounts/{account_id}/history")
def get_account_history(
    account_id: str,
    user: CurrentUser,
    store: Store,
    months: Annotated[int, Query(ge=1, le=24)] = 6,
) -> dict[str, Any]:
    _first_or_404(
        store.select(
            "bank_accounts",
            {"select": "id"} | _owned_params(str(user["id"]), account_id),
        ),
        "Bank account",
    )
    transactions = store.select(
        "transactions",
        {
            "select": "amount,type,transaction_date",
            "user_id": f"eq.{user['id']}",
            "bank_account_id": f"eq.{account_id}",
            "order": "transaction_date.asc",
        },
    )
    totals = {month: 0.0 for month in _previous_months(months)}
    for transaction in transactions:
        month = str(transaction["transaction_date"])[:7]
        if month in totals:
            amount = float(transaction["amount"])
            totals[month] += amount if transaction["type"] == "income" else -amount
    history = [
        {"month": month, "net_change": round(net_change, 2)}
        for month, net_change in totals.items()
    ]
    return {"status": "success", "data": {"history": history}}


def _default_categories(
    store: DataStore, category_type: str | None = None
) -> list[dict[str, Any]]:
    params = {"select": "*", "is_default": "eq.true", "order": "name.asc"}
    if category_type is not None:
        params["type"] = f"eq.{category_type}"
    return store.select("categories", params)


def _user_categories(
    store: DataStore, user_id: str, category_type: str | None = None
) -> list[dict[str, Any]]:
    params = {"select": "*", "user_id": f"eq.{user_id}", "order": "name.asc"}
    if category_type is not None:
        params["type"] = f"eq.{category_type}"
    return store.select("user_categories", params)


@router.get("/categories/default")
def get_default_categories(user: CurrentUser, store: Store) -> dict[str, Any]:
    del user
    return {"status": "success", "data": {"categories": _default_categories(store)}}


@router.get("/categories/type/{category_type}")
def get_categories_by_type(
    category_type: Literal["income", "expense"], user: CurrentUser, store: Store
) -> dict[str, Any]:
    defaults = [
        category | {"source": "default"}
        for category in _default_categories(store, category_type)
    ]
    custom = [
        category | {"source": "user"}
        for category in _user_categories(store, str(user["id"]), category_type)
    ]
    categories = sorted(defaults + custom, key=lambda item: str(item["name"]).casefold())
    return {"status": "success", "data": {"categories": categories}}


@router.get("/categories/user")
def get_user_categories(user: CurrentUser, store: Store) -> dict[str, Any]:
    return {
        "status": "success",
        "data": {"categories": _user_categories(store, str(user["id"]))},
    }


@router.post("/categories", status_code=201)
@router.post("/categories/user", status_code=201, include_in_schema=False)
def create_user_category(
    payload: UserCategoryCreate, user: CurrentUser, store: Store
) -> dict[str, Any]:
    category = _first_or_404(
        store.insert(
            "user_categories", _changes(payload) | {"user_id": user["id"]}
        ),
        "Category",
    )
    return {"status": "success", "data": {"category": category}}


@router.get("/categories/user/{category_id}")
def get_user_category(
    category_id: str, user: CurrentUser, store: Store
) -> dict[str, Any]:
    category = _first_or_404(
        store.select(
            "user_categories",
            {"select": "*"} | _owned_params(str(user["id"]), category_id),
        ),
        "Category",
    )
    return {"status": "success", "data": {"category": category}}


@router.patch("/categories/user/{category_id}")
def update_user_category(
    category_id: str,
    payload: UserCategoryUpdate,
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    changes = _changes(payload)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    category = _first_or_404(
        store.update(
            "user_categories", changes, _owned_params(str(user["id"]), category_id)
        ),
        "Category",
    )
    return {"status": "success", "data": {"category": category}}


@router.delete("/categories/user/{category_id}", status_code=204)
def delete_user_category(
    category_id: str, user: CurrentUser, store: Store
) -> Response:
    _first_or_404(
        store.delete(
            "user_categories", _owned_params(str(user["id"]), category_id)
        ),
        "Category",
    )
    return Response(status_code=204)


@router.get("/categories")
def get_all_categories(user: CurrentUser, store: Store) -> dict[str, Any]:
    defaults = [category | {"source": "default"} for category in _default_categories(store)]
    custom = [
        category | {"source": "user"}
        for category in _user_categories(store, str(user["id"]))
    ]
    categories = sorted(defaults + custom, key=lambda item: str(item["name"]).casefold())
    return {"status": "success", "data": {"categories": categories}}
