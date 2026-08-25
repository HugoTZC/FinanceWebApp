"""First contract-compatible financial MVP routes migrated from Express."""

from __future__ import annotations

import math
import os
from collections.abc import Generator, Mapping
from datetime import date
from typing import Annotated, Any, Literal, Protocol

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field

from supabase_client import SupabaseRestClient


class DataStore(Protocol):
    def select(
        self, table: str, params: Mapping[str, str] | None = None
    ) -> list[dict[str, Any]]: ...

    def insert(
        self, table: str, payload: Mapping[str, Any]
    ) -> list[dict[str, Any]]: ...

    def update(
        self,
        table: str,
        payload: Mapping[str, Any],
        params: Mapping[str, str],
    ) -> list[dict[str, Any]]: ...

    def delete(
        self, table: str, params: Mapping[str, str]
    ) -> list[dict[str, Any]]: ...


def get_store() -> Generator[DataStore, None, None]:
    client = SupabaseRestClient.from_environment()
    try:
        yield client
    finally:
        client.close()


def _authentication_error(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)


def get_current_user(
    request: Request,
    store: Annotated[DataStore, Depends(get_store)],
) -> dict[str, Any]:
    authorization = request.headers.get("Authorization", "")
    token = authorization.removeprefix("Bearer ").strip() if authorization.startswith("Bearer ") else ""
    if not token:
        token = request.cookies.get("jwt", "")
    if not token:
        raise _authentication_error(
            "Authentication required. Please log in to access this resource."
        )

    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT verification is not configured",
        )

    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise _authentication_error(
            "Your authentication token has expired. Please log in again."
        ) from exc
    except jwt.PyJWTError as exc:
        raise _authentication_error(
            "Invalid authentication token. Please log in again."
        ) from exc

    user_id = claims.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise _authentication_error("Invalid authentication token. Please log in again.")

    users = store.select(
        "users",
        {
            "select": "id,email,first_name,last_name,second_last_name,nickname,avatar_url,created_at,updated_at",
            "id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    if not users:
        raise _authentication_error(
            "The user associated with this token no longer exists."
        )
    return users[0]


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
Store = Annotated[DataStore, Depends(get_store)]


class BankAccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    account_number: str | None = Field(default=None, max_length=80)
    account_type: str = Field(min_length=1, max_length=60)
    balance: float = 0
    is_default: bool = False


class BankAccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    account_number: str | None = Field(default=None, max_length=80)
    account_type: str | None = Field(default=None, min_length=1, max_length=60)
    balance: float | None = None
    is_default: bool | None = None


class UserCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: Literal["income", "expense"]
    category_group: str | None = Field(default=None, max_length=120)
    icon: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=40)


class UserCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: Literal["income", "expense"] | None = None
    category_group: str | None = Field(default=None, max_length=120)
    icon: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=40)


class CreditCardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    last_four: str | None = Field(default=None, min_length=4, max_length=4)
    card_type: str | None = Field(default=None, max_length=60)
    balance: float = 0
    credit_limit: float | None = Field(default=None, ge=0)
    interest_rate: float | None = Field(default=None, ge=0)
    due_date: date | None = None
    min_payment: float | None = Field(default=None, ge=0)


class CreditCardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    last_four: str | None = Field(default=None, min_length=4, max_length=4)
    card_type: str | None = Field(default=None, max_length=60)
    balance: float | None = None
    credit_limit: float | None = Field(default=None, ge=0)
    interest_rate: float | None = Field(default=None, ge=0)
    due_date: date | None = None
    min_payment: float | None = Field(default=None, ge=0)


router = APIRouter(tags=["financial-mvp"])


def _owned_params(user_id: str, item_id: str | None = None) -> dict[str, str]:
    params = {"user_id": f"eq.{user_id}"}
    if item_id:
        params["id"] = f"eq.{item_id}"
    return params


def _json_payload(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(mode="json", exclude_unset=True)


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
    data = _json_payload(payload) | {"user_id": user["id"]}
    account = _first_or_404(store.insert("bank_accounts", data), "Bank account")
    if payload.is_default:
        store.update(
            "bank_accounts",
            {"is_default": False},
            {
                "user_id": f"eq.{user['id']}",
                "id": f"neq.{account['id']}",
            },
        )
    return {"status": "success", "data": {"account": account}}


@router.get("/accounts/{account_id}")
def get_account(account_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    account = _first_or_404(
        store.select("bank_accounts", {"select": "*"} | _owned_params(user["id"], account_id)),
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
    changes = _json_payload(payload)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    account = _first_or_404(
        store.update("bank_accounts", changes, _owned_params(user["id"], account_id)),
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
def delete_account(
    account_id: str, user: CurrentUser, store: Store
) -> Response:
    _first_or_404(
        store.delete("bank_accounts", _owned_params(user["id"], account_id)),
        "Bank account",
    )
    return Response(status_code=204)


def _month_key(value: date) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def _previous_months(count: int, today: date | None = None) -> list[str]:
    current = today or date.today()
    months: list[str] = []
    year, month = current.year, current.month
    for _ in range(count):
        months.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


@router.get("/accounts/{account_id}/history")
def get_account_history(
    account_id: str,
    user: CurrentUser,
    store: Store,
    months: Annotated[int, Query(ge=1, le=24)] = 6,
) -> dict[str, Any]:
    _first_or_404(
        store.select("bank_accounts", {"select": "id"} | _owned_params(user["id"], account_id)),
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
        tx_date = date.fromisoformat(str(transaction["transaction_date"])[:10])
        key = _month_key(tx_date)
        if key in totals:
            amount = float(transaction["amount"])
            totals[key] += amount if transaction["type"] == "income" else -amount
    history = [
        {"month": month, "net_change": round(net_change, 2)}
        for month, net_change in totals.items()
    ]
    return {"status": "success", "data": {"history": history}}


def _default_categories(store: DataStore, category_type: str | None = None) -> list[dict[str, Any]]:
    params = {"select": "*", "is_default": "eq.true", "order": "name.asc"}
    if category_type:
        params["type"] = f"eq.{category_type}"
    return store.select("categories", params)


def _user_categories(
    store: DataStore, user_id: str, category_type: str | None = None
) -> list[dict[str, Any]]:
    params = {"select": "*", "user_id": f"eq.{user_id}", "order": "name.asc"}
    if category_type:
        params["type"] = f"eq.{category_type}"
    return store.select("user_categories", params)


@router.get("/categories/default")
def get_default_categories(user: CurrentUser, store: Store) -> dict[str, Any]:
    del user
    return {
        "status": "success",
        "data": {"categories": _default_categories(store)},
    }


@router.get("/categories")
def get_all_categories(user: CurrentUser, store: Store) -> dict[str, Any]:
    defaults = [category | {"source": "default"} for category in _default_categories(store)]
    custom = [
        category | {"source": "user"}
        for category in _user_categories(store, user["id"])
    ]
    categories = sorted(defaults + custom, key=lambda item: item["name"].casefold())
    return {"status": "success", "data": {"categories": categories}}


@router.get("/categories/type/{category_type}")
def get_categories_by_type(
    category_type: Literal["income", "expense"],
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    defaults = [
        category | {"source": "default"}
        for category in _default_categories(store, category_type)
    ]
    custom = [
        category | {"source": "user"}
        for category in _user_categories(store, user["id"], category_type)
    ]
    categories = sorted(defaults + custom, key=lambda item: item["name"].casefold())
    return {"status": "success", "data": {"categories": categories}}


@router.get("/categories/user")
def get_user_categories(user: CurrentUser, store: Store) -> dict[str, Any]:
    return {
        "status": "success",
        "data": {"categories": _user_categories(store, user["id"])},
    }


@router.post("/categories/user", status_code=201)
def create_user_category(
    payload: UserCategoryCreate, user: CurrentUser, store: Store
) -> dict[str, Any]:
    category = _first_or_404(
        store.insert(
            "user_categories", _json_payload(payload) | {"user_id": user["id"]}
        ),
        "Category",
    )
    return {"status": "success", "data": {"category": category}}


@router.get("/categories/user/{category_id}")
def get_user_category(
    category_id: str, user: CurrentUser, store: Store
) -> dict[str, Any]:
    category = _first_or_404(
        store.select("user_categories", {"select": "*"} | _owned_params(user["id"], category_id)),
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
    changes = _json_payload(payload)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    category = _first_or_404(
        store.update("user_categories", changes, _owned_params(user["id"], category_id)),
        "Category",
    )
    return {"status": "success", "data": {"category": category}}


@router.delete("/categories/user/{category_id}", status_code=204)
def delete_user_category(
    category_id: str, user: CurrentUser, store: Store
) -> Response:
    _first_or_404(
        store.delete("user_categories", _owned_params(user["id"], category_id)),
        "Category",
    )
    return Response(status_code=204)


@router.get("/credit/cards")
def get_credit_cards(user: CurrentUser, store: Store) -> dict[str, Any]:
    cards = store.select(
        "credit_cards",
        {"select": "*", "user_id": f"eq.{user['id']}", "order": "name.asc"},
    )
    return {"status": "success", "data": {"cards": cards}}


@router.post("/credit/cards", status_code=201)
def create_credit_card(
    payload: CreditCardCreate, user: CurrentUser, store: Store
) -> dict[str, Any]:
    card = _first_or_404(
        store.insert("credit_cards", _json_payload(payload) | {"user_id": user["id"]}),
        "Credit card",
    )
    return {"status": "success", "data": {"card": card}}


@router.get("/credit/cards/{card_id}")
def get_credit_card(card_id: str, user: CurrentUser, store: Store) -> dict[str, Any]:
    card = _first_or_404(
        store.select("credit_cards", {"select": "*"} | _owned_params(user["id"], card_id)),
        "Credit card",
    )
    return {"status": "success", "data": {"card": card}}


@router.put("/credit/cards/{card_id}")
def update_credit_card(
    card_id: str,
    payload: CreditCardUpdate,
    user: CurrentUser,
    store: Store,
) -> dict[str, Any]:
    changes = _json_payload(payload)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    card = _first_or_404(
        store.update("credit_cards", changes, _owned_params(user["id"], card_id)),
        "Credit card",
    )
    return {"status": "success", "data": {"card": card}}


@router.delete("/credit/cards/{card_id}", status_code=204)
def delete_credit_card(card_id: str, user: CurrentUser, store: Store) -> Response:
    _first_or_404(
        store.delete("credit_cards", _owned_params(user["id"], card_id)),
        "Credit card",
    )
    return Response(status_code=204)


def _parse_transaction_date(value: Any) -> date:
    return date.fromisoformat(str(value)[:10])


def _transaction_matches(
    transaction: Mapping[str, Any],
    *,
    transaction_type: str | None,
    category_id: str | None,
    user_category_id: str | None,
    payment_method: str | None,
    start_date: date | None,
    end_date: date | None,
    year: int | None,
    month: int | None,
    search: str | None,
) -> bool:
    tx_date = _parse_transaction_date(transaction["transaction_date"])
    return not (
        (transaction_type and transaction.get("type") != transaction_type)
        or (category_id and transaction.get("category_id") != category_id)
        or (user_category_id and transaction.get("user_category_id") != user_category_id)
        or (payment_method and transaction.get("payment_method") != payment_method)
        or (start_date and tx_date < start_date)
        or (end_date and tx_date > end_date)
        or (year and tx_date.year != year)
        or (month and tx_date.month != month)
        or (search and search.casefold() not in str(transaction.get("title", "")).casefold())
    )


def _name_map(rows: list[dict[str, Any]]) -> dict[str, str]:
    return {str(row["id"]): str(row["name"]) for row in rows}


def _enrich_transactions(
    transactions: list[dict[str, Any]], user_id: str, store: DataStore
) -> list[dict[str, Any]]:
    categories = _name_map(store.select("categories", {"select": "id,name"}))
    user_categories = _name_map(
        store.select(
            "user_categories",
            {"select": "id,name", "user_id": f"eq.{user_id}"},
        )
    )
    accounts = _name_map(
        store.select(
            "bank_accounts", {"select": "id,name", "user_id": f"eq.{user_id}"}
        )
    )
    cards = _name_map(
        store.select(
            "credit_cards", {"select": "id,name", "user_id": f"eq.{user_id}"}
        )
    )

    enriched: list[dict[str, Any]] = []
    for transaction in transactions:
        category_id = transaction.get("category_id")
        user_category_id = transaction.get("user_category_id")
        category_name = categories.get(str(category_id)) if category_id else None
        user_category_name = (
            user_categories.get(str(user_category_id)) if user_category_id else None
        )
        enriched.append(
            transaction
            | {
                "date": transaction.get("transaction_date"),
                "description": transaction.get("title"),
                "category": category_name or user_category_name or "Other",
                "category_name": category_name,
                "user_category_name": user_category_name,
                "bank_account_name": accounts.get(str(transaction.get("bank_account_id"))),
                "credit_card_name": cards.get(str(transaction.get("credit_card_id"))),
            }
        )
    return enriched


@router.get("/transactions/years")
def get_transaction_years(user: CurrentUser, store: Store) -> dict[str, Any]:
    transactions = store.select(
        "transactions",
        {
            "select": "transaction_date",
            "user_id": f"eq.{user['id']}",
            "order": "transaction_date.desc",
        },
    )
    years = sorted(
        {_parse_transaction_date(item["transaction_date"]).year for item in transactions},
        reverse=True,
    )
    if not years:
        current_year = date.today().year
        years = [current_year, current_year - 1, current_year - 2]
    return {"status": "success", "data": {"years": [{"year": year} for year in years]}}


@router.get("/transactions")
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
    year: int | None = None,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
    search: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> dict[str, Any]:
    transactions = store.select(
        "transactions",
        {
            "select": "*",
            "user_id": f"eq.{user['id']}",
            "order": "transaction_date.desc",
        },
    )
    selected_category = category_id or category
    filtered = [
        transaction
        for transaction in transactions
        if _transaction_matches(
            transaction,
            transaction_type=transaction_type,
            category_id=selected_category,
            user_category_id=user_category_id,
            payment_method=payment_method,
            start_date=start_date,
            end_date=end_date,
            year=year,
            month=month,
            search=search,
        )
    ]
    total = len(filtered)
    start = (page - 1) * limit
    items = _enrich_transactions(filtered[start : start + limit], user["id"], store)
    return {
        "status": "success",
        "data": {
            "transactions": items,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": math.ceil(total / limit),
            },
        },
    }


@router.get("/transactions/{transaction_id}")
def get_transaction(
    transaction_id: str, user: CurrentUser, store: Store
) -> dict[str, Any]:
    transaction = _first_or_404(
        store.select(
            "transactions",
            {"select": "*"} | _owned_params(user["id"], transaction_id),
        ),
        "Transaction",
    )
    enriched = _enrich_transactions([transaction], user["id"], store)[0]
    return {"status": "success", "data": {"transaction": enriched}}


@router.get("/credit/cards/{card_id}/spending")
def get_card_spending(
    card_id: str,
    user: CurrentUser,
    store: Store,
    year: int | None = None,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
) -> dict[str, Any]:
    _first_or_404(
        store.select("credit_cards", {"select": "id"} | _owned_params(user["id"], card_id)),
        "Credit card",
    )
    transactions = store.select(
        "transactions",
        {
            "select": "*",
            "user_id": f"eq.{user['id']}",
            "credit_card_id": f"eq.{card_id}",
            "order": "transaction_date.desc",
        },
    )
    filtered = [
        item
        for item in transactions
        if (year is None or _parse_transaction_date(item["transaction_date"]).year == year)
        and (month is None or _parse_transaction_date(item["transaction_date"]).month == month)
    ]
    return {
        "status": "success",
        "data": {"transactions": _enrich_transactions(filtered, user["id"], store)},
    }
