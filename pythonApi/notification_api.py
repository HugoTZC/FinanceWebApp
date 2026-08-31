"""Owner-scoped notification routes for the FastAPI migration."""
from __future__ import annotations
import math
from typing import Annotated, Any
from fastapi import APIRouter, HTTPException, Query, Response
from auth_api import CurrentUser, Store

router = APIRouter(prefix="/notifications", tags=["notifications"])

def _owned(user_id: str, item_id: str | None = None) -> dict[str, str]:
    params = {"user_id": f"eq.{user_id}"}
    if item_id:
        params["id"] = f"eq.{item_id}"
    return params

def _require(rows: list[dict[str, Any]]) -> None:
    if not rows:
        raise HTTPException(status_code=404, detail="Notification not found")

@router.get("")
def get_notifications(user: CurrentUser, store: Store, page: Annotated[int, Query(ge=1)] = 1, limit: Annotated[int, Query(ge=1, le=100)] = 10, unread_only: bool = False, notification_type: Annotated[str | None, Query(alias="type")] = None) -> dict[str, Any]:
    rows = store.select("notifications", {"select": "*", "user_id": f"eq.{user['id']}", "order": "notification_date.desc"})
    if unread_only:
        rows = [row for row in rows if not row.get("is_read")]
    if notification_type:
        rows = [row for row in rows if row.get("type") == notification_type]
    total = len(rows)
    offset = (page - 1) * limit
    return {"status": "success", "data": {"notifications": rows[offset:offset + limit], "pagination": {"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit)}}}

@router.patch("/read-all")
def mark_all_as_read(user: CurrentUser, store: Store) -> dict[str, str]:
    store.update("notifications", {"is_read": True}, {"user_id": f"eq.{user['id']}", "is_read": "eq.false"})
    return {"status": "success", "message": "All notifications marked as read"}

@router.delete("/clear-all", status_code=204)
def clear_all_notifications(user: CurrentUser, store: Store) -> Response:
    store.delete("notifications", {"user_id": f"eq.{user['id']}", "is_read": "eq.true"})
    return Response(status_code=204)

@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: str, user: CurrentUser, store: Store) -> dict[str, str]:
    rows = store.update("notifications", {"is_read": True}, _owned(str(user["id"]), notification_id))
    _require(rows)
    return {"status": "success", "message": "Notification marked as read"}

@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: str, user: CurrentUser, store: Store) -> Response:
    rows = store.delete("notifications", _owned(str(user["id"]), notification_id))
    _require(rows)
    return Response(status_code=204)
