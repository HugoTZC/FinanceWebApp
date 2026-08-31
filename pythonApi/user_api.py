"""Profile, settings and account routes for the FastAPI migration."""
from __future__ import annotations
from pathlib import PurePosixPath
from typing import Any, Literal
from uuid import uuid4
from fastapi import APIRouter, File, HTTPException, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from auth_api import ACCESS_COOKIE, REFRESH_COOKIE, CurrentUser, Store, _public_user
from storage_client import AVATAR_BUCKET, Storage

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

AVATAR_TYPES = {
    b"\xff\xd8\xff": ("image/jpeg", "jpg"),
    b"\x89PNG\r\n\x1a\n": ("image/png", "png"),
    b"GIF87a": ("image/gif", "gif"),
    b"GIF89a": ("image/gif", "gif"),
}

def _avatar_type(content: bytes) -> tuple[str, str] | None:
    for signature, result in AVATAR_TYPES.items():
        if content.startswith(signature):
            return result
    if len(content) >= 12 and content[0:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None

def _stored_avatar_path(url: str | None) -> str | None:
    marker = f"/storage/v1/object/public/{AVATAR_BUCKET}/"
    if not url or marker not in url:
        return None
    path = url.split(marker, 1)[1]
    return path if path and ".." not in PurePosixPath(path).parts else None

@router.get("/profile")
def get_profile(user: CurrentUser) -> dict[str, Any]:
    return {"status": "success", "data": {"user": _public_user(user)}}

@router.patch("/profile")
def update_profile(payload: ProfileUpdate, user: CurrentUser, store: Store) -> dict[str, Any]:
    updated = _one(store.update("users", _changes(payload), {"id": f"eq.{user['id']}"}), "User")
    return {"status": "success", "data": {"user": _public_user(updated)}}

@router.post("/avatar")
async def upload_avatar(user: CurrentUser, store: Store, storage: Storage, avatar: UploadFile = File(...)) -> dict[str, Any]:
    content = await avatar.read(5 * 1024 * 1024 + 1)
    if not content or len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Avatar must be between 1 byte and 5 MB")
    detected = _avatar_type(content)
    if detected is None:
        raise HTTPException(status_code=415, detail="Avatar must be a JPEG, PNG, WebP or GIF image")
    content_type, extension = detected
    user_id = str(user["id"])
    object_path = f"{user_id}/{uuid4().hex}.{extension}"
    avatar_url = storage.upload(AVATAR_BUCKET, object_path, content, content_type)
    old_path = _stored_avatar_path(str(user.get("avatar_url") or ""))
    try:
        updated = _one(store.update("users", {"avatar_url": avatar_url}, {"id": f"eq.{user_id}"}), "User")
    except Exception:
        storage.delete(AVATAR_BUCKET, [object_path])
        raise
    if old_path and old_path != object_path:
        storage.delete(AVATAR_BUCKET, [old_path])
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
