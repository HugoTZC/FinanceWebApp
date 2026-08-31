"""Profile, settings and account routes for the FastAPI migration."""
from __future__ import annotations
from typing import Any, Literal
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from auth_api import ACCESS_COOKIE, REFRESH_COOKIE, CurrentUser, Store, _public_user

router = APIRouter(prefix="/users", tags=["users"])

class ProfileUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    second_last_name: str | None = Field(default=None, max_length=100)
    nickname: str | None = Field(default=None, max_length=100)

class SettingsUpdate(BaseModel):
    language: str | None = Field(default=None, min_length=2, max_length=10)
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    theme: Literal["light", "dark", "system"] | None = None

class NotificationPreferencesUpdate(BaseModel):
    budget_email: bool | None = None
    payment_email: bool | None = None
    savings_email: bool | None = None
    credit_email: bool | None = None
    budget_push: bool | None = None
    payment_push: bool | None = None
    savings_push: bool | None = None
    credit_push: bool | None = None

def _changes(payload: BaseModel) -> dict[str, Any]:
    changes = payload.model_dump(mode="json", exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    return changes

def _one(rows: list[dict[str, Any]], resource: str) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=404, detail=f"{resource} not found")
    return rows[0]

def _owned(user_id: str) -> dict[str, str]:
    return {"user_id": f"eq.{user_id}"}

@router.get("/profile")
def get_profile(user: CurrentUser) -> dict[str, Any]:
    return {"status": "success", "data": {"user": _public_user(user)}}

@router.patch("/profile")
def update_profile(payload: ProfileUpdate, user: CurrentUser, store: Store) -> dict[str, Any]:
    updated = _one(store.update("users", _changes(payload), {"id": f"eq.{user['id']}"}), "User")
    return {"status": "success", "data": {"user": _public_user(updated)}}

@router.get("/settings")
def get_settings(user: CurrentUser, store: Store) -> dict[str, Any]:
    rows = store.select("user_settings", {"select": "*"} | _owned(str(user["id"])))
    if not rows:
        rows = store.insert("user_settings", {"user_id": user["id"]})
    return {"status": "success", "data": {"settings": _one(rows, "Settings")}}

@router.patch("/settings")
def update_settings(payload: SettingsUpdate, user: CurrentUser, store: Store) -> dict[str, Any]:
    changes = _changes(payload)
    rows = store.update("user_settings", changes, _owned(str(user["id"])))
    if not rows:
        rows = store.insert("user_settings", {"user_id": user["id"]} | changes)
    return {"status": "success", "data": {"settings": _one(rows, "Settings")}}

@router.get("/notification-preferences")
def get_notification_preferences(user: CurrentUser, store: Store) -> dict[str, Any]:
    rows = store.select("notification_preferences", {"select": "*"} | _owned(str(user["id"])))
    if not rows:
        rows = store.insert("notification_preferences", {"user_id": user["id"]})
    return {"status": "success", "data": {"preferences": _one(rows, "Notification preferences")}}

@router.patch("/notification-preferences")
def update_notification_preferences(payload: NotificationPreferencesUpdate, user: CurrentUser, store: Store) -> dict[str, Any]:
    changes = _changes(payload)
    rows = store.update("notification_preferences", changes, _owned(str(user["id"])))
    if not rows:
        rows = store.insert("notification_preferences", {"user_id": user["id"]} | changes)
    return {"status": "success", "data": {"preferences": _one(rows, "Notification preferences")}}

@router.delete("", status_code=204)
def delete_account(response: Response, user: CurrentUser, store: Store) -> Response:
    user_id = str(user["id"])
    store.delete("auth_refresh_tokens", {"user_id": f"eq.{user_id}"})
    _one(store.delete("users", {"id": f"eq.{user_id}"}), "User")
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/api")
    response.status_code = 204
    return response
