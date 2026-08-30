"""Contract-compatible authentication routes for the FastAPI migration."""

from __future__ import annotations

import hashlib
import os
import secrets
from collections.abc import Generator, Mapping
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Protocol
from uuid import uuid4

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field, model_validator

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


Store = Annotated[DataStore, Depends(get_store)]
router = APIRouter(prefix="/auth", tags=["authentication"])

ACCESS_COOKIE = "jwt"
REFRESH_COOKIE = "refreshJwt"
ACCESS_HOURS = 24
REFRESH_DAYS = 7


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    password_confirm: str
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    second_last_name: str | None = Field(default=None, max_length=100)
    nickname: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class PasswordUpdateRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=10, max_length=72)
    new_password_confirm: str

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordUpdateRequest":
        if self.new_password != self.new_password_confirm:
            raise ValueError("New passwords do not match")
        return self


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=10, max_length=72)
    password_confirm: str

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self


def _secret(name: str) -> str:
    value = os.getenv(name, "")
    if not value:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured",
        )
    return value


def _public_user(user: Mapping[str, Any]) -> dict[str, Any]:
    fields = (
        "id",
        "email",
        "first_name",
        "last_name",
        "second_last_name",
        "nickname",
        "avatar_url",
        "created_at",
        "updated_at",
    )
    return {field: user.get(field) for field in fields if field in user}


def _find_user(store: DataStore, *, user_id: str | None = None, email: str | None = None, include_password: bool = False) -> dict[str, Any] | None:
    select = "id,email,first_name,last_name,second_last_name,nickname,avatar_url,created_at,updated_at,password_changed_at"
    if include_password:
        select += ",password_hash"
    params = {"select": select, "limit": "1"}
    if user_id:
        params["id"] = f"eq.{user_id}"
    elif email:
        params["email"] = f"eq.{email.lower()}"
    rows = store.select("users", params)
    return rows[0] if rows else None


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def _password_matches(password: str, encoded: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), encoded.encode())
    except ValueError:
        return False


def _encode_token(user_id: str, *, refresh: bool) -> tuple[str, str, datetime]:
    now = datetime.now(UTC)
    expires = now + (timedelta(days=REFRESH_DAYS) if refresh else timedelta(hours=ACCESS_HOURS))
    jti = str(uuid4())
    token = jwt.encode(
        {
            "id": user_id,
            "sub": user_id,
            "iat": now,
            "exp": expires,
            "jti": jti,
            "typ": "refresh" if refresh else "access",
        },
        _secret("JWT_REFRESH_SECRET" if refresh else "JWT_SECRET"),
        algorithm="HS256",
    )
    return token, jti, expires


def _decode_token(token: str, *, refresh: bool) -> dict[str, Any]:
    try:
        claims = jwt.decode(
            token,
            _secret("JWT_REFRESH_SECRET" if refresh else "JWT_SECRET"),
            algorithms=["HS256"],
            options={"require": ["exp", "iat"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Authentication token has expired") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc
    expected = "refresh" if refresh else "access"
    if claims.get("typ") not in {None, expected}:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    user_id = claims.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return claims


def _request_token(request: Request, cookie: str) -> str:
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        return authorization.removeprefix("Bearer ").strip()
    return request.cookies.get(cookie, "")


def _request_refresh_token(request: Request) -> str:
    cookie_token = request.cookies.get(REFRESH_COOKIE, "")
    if cookie_token:
        return cookie_token
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        return authorization.removeprefix("Bearer ").strip()
    return ""


def _set_cookie(response: Response, name: str, value: str, *, refresh: bool) -> None:
    response.set_cookie(
        name,
        value,
        max_age=int((timedelta(days=REFRESH_DAYS) if refresh else timedelta(hours=ACCESS_HOURS)).total_seconds()),
        httponly=True,
        secure=os.getenv("NODE_ENV") == "production" or os.getenv("VERCEL_ENV") == "production",
        samesite="lax",
        path="/api" if refresh else "/",
    )


def _issue_session(user: Mapping[str, Any], response: Response, store: DataStore) -> dict[str, Any]:
    access, _, _ = _encode_token(str(user["id"]), refresh=False)
    refresh, jti, expires = _encode_token(str(user["id"]), refresh=True)
    store.insert(
        "auth_refresh_tokens",
        {"user_id": user["id"], "token_hash": hashlib.sha256(jti.encode()).hexdigest(), "expires_at": expires.isoformat()},
    )
    _set_cookie(response, ACCESS_COOKIE, access, refresh=False)
    _set_cookie(response, REFRESH_COOKIE, refresh, refresh=True)
    return {"status": "success", "token": access, "refreshToken": refresh, "data": {"user": _public_user(user)}}


def get_current_user(request: Request, store: Store) -> dict[str, Any]:
    token = _request_token(request, ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    claims = _decode_token(token, refresh=False)
    user = _find_user(store, user_id=claims["id"])
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    changed_at = user.get("password_changed_at")
    if changed_at:
        changed = datetime.fromisoformat(str(changed_at).replace("Z", "+00:00"))
        issued = datetime.fromtimestamp(claims["iat"], UTC)
        if changed.tzinfo is None:
            changed = changed.replace(tzinfo=UTC)
        if issued < changed:
            raise HTTPException(status_code=401, detail="Password changed; log in again")
    return user


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]


@router.post("/register", status_code=201)
def register(payload: RegisterRequest, response: Response, store: Store) -> dict[str, Any]:
    if _find_user(store, email=str(payload.email)):
        raise HTTPException(status_code=400, detail="Email already in use")
    users = store.insert(
        "users",
        {
            "email": str(payload.email).lower(),
            "password_hash": _hash_password(payload.password),
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "second_last_name": payload.second_last_name,
            "nickname": payload.nickname,
        },
    )
    if not users:
        raise HTTPException(status_code=502, detail="Unable to create user")
    user = users[0]
    store.insert("user_settings", {"user_id": user["id"]})
    store.insert("notification_preferences", {"user_id": user["id"]})
    return _issue_session(user, response, store)


@router.post("/login")
def login(payload: LoginRequest, response: Response, store: Store) -> dict[str, Any]:
    user = _find_user(store, email=str(payload.email), include_password=True)
    if not user or not _password_matches(payload.password, str(user.get("password_hash", ""))):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return _issue_session(user, response, store)


@router.post("/logout")
def logout(request: Request, response: Response, store: Store) -> dict[str, str]:
    token = _request_refresh_token(request)
    if token:
        try:
            claims = _decode_token(token, refresh=True)
            if claims.get("jti"):
                store.delete("auth_refresh_tokens", {"token_hash": f"eq.{hashlib.sha256(claims['jti'].encode()).hexdigest()}"})
        except HTTPException:
            pass
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/api")
    return {"status": "success", "message": "Logged out successfully"}


@router.post("/refresh-token")
def refresh_token(request: Request, response: Response, store: Store) -> dict[str, Any]:
    token = _request_refresh_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token found")
    claims = _decode_token(token, refresh=True)
    if claims.get("jti"):
        digest = hashlib.sha256(claims["jti"].encode()).hexdigest()
        active = store.select("auth_refresh_tokens", {"select": "id", "token_hash": f"eq.{digest}", "revoked_at": "is.null", "limit": "1"})
        if not active:
            raise HTTPException(status_code=401, detail="Refresh token has been revoked")
        store.update("auth_refresh_tokens", {"revoked_at": datetime.now(UTC).isoformat()}, {"token_hash": f"eq.{digest}"})
    user = _find_user(store, user_id=claims["id"])
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return _issue_session(user, response, store)


@router.get("/me")
def me(user: CurrentUser) -> dict[str, Any]:
    return {"status": "success", "data": {"user": _public_user(user)}}


@router.patch("/update-password")
def update_password(payload: PasswordUpdateRequest, response: Response, user: CurrentUser, store: Store) -> dict[str, Any]:
    stored = _find_user(store, user_id=str(user["id"]), include_password=True)
    if not stored or not _password_matches(payload.current_password, str(stored.get("password_hash", ""))):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    updated = store.update(
        "users",
        {"password_hash": _hash_password(payload.new_password), "password_changed_at": datetime.now(UTC).isoformat()},
        {"id": f"eq.{user['id']}"},
    )
    store.update("auth_refresh_tokens", {"revoked_at": datetime.now(UTC).isoformat()}, {"user_id": f"eq.{user['id']}", "revoked_at": "is.null"})
    return _issue_session(updated[0] if updated else user, response, store)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, store: Store) -> dict[str, str]:
    user = _find_user(store, email=str(payload.email))
    if user:
        raw_token = secrets.token_urlsafe(32)
        store.update(
            "users",
            {"password_reset_token": hashlib.sha256(raw_token.encode()).hexdigest(), "password_reset_expires": (datetime.now(UTC) + timedelta(minutes=10)).isoformat()},
            {"id": f"eq.{user['id']}"},
        )
        # Delivery is intentionally external; never return or log the raw token.
    return {"status": "success", "message": "If the account exists, password reset instructions will be sent."}


@router.patch("/reset-password/{token}")
def reset_password(token: str, payload: ResetPasswordRequest, response: Response, store: Store) -> dict[str, Any]:
    digest = hashlib.sha256(token.encode()).hexdigest()
    rows = store.select("users", {"select": "*", "password_reset_token": f"eq.{digest}", "password_reset_expires": f"gt.{datetime.now(UTC).isoformat()}", "limit": "1"})
    if not rows:
        raise HTTPException(status_code=400, detail="Token is invalid or has expired")
    user = rows[0]
    updated = store.update(
        "users",
        {"password_hash": _hash_password(payload.password), "password_changed_at": datetime.now(UTC).isoformat(), "password_reset_token": None, "password_reset_expires": None},
        {"id": f"eq.{user['id']}"},
    )
    store.update("auth_refresh_tokens", {"revoked_at": datetime.now(UTC).isoformat()}, {"user_id": f"eq.{user['id']}", "revoked_at": "is.null"})
    return _issue_session(updated[0] if updated else user, response, store)
