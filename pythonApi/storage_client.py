"""Server-only Supabase Storage client used for persistent user assets."""

from __future__ import annotations

import os
from collections.abc import Generator
from typing import Annotated, Protocol
from urllib.parse import quote

import httpx
from fastapi import Depends

from supabase_client import SupabaseConfigurationError, SupabaseRequestError


AVATAR_BUCKET = "avatars"


class ObjectStorage(Protocol):
    def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> str: ...
    def delete(self, bucket: str, paths: list[str]) -> None: ...


class SupabaseStorageClient:
    def __init__(self, url: str, api_key: str, *, transport: httpx.BaseTransport | None = None) -> None:
        if not url or not api_key:
            raise SupabaseConfigurationError("Supabase Storage is not configured")
        self._url = url.rstrip("/")
        headers = {"apikey": api_key}
        if not api_key.startswith("sb_secret_"):
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.Client(
            base_url=f"{self._url}/storage/v1/", headers=headers, timeout=15.0, transport=transport
        )

    @classmethod
    def from_environment(cls) -> "SupabaseStorageClient":
        return cls(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))

    def close(self) -> None:
        self._client.close()

    def ensure_avatar_bucket(self) -> None:
        response = self._client.get(f"bucket/{AVATAR_BUCKET}")
        if response.status_code == 404:
            response = self._client.post(
                "bucket",
                json={
                    "id": AVATAR_BUCKET,
                    "name": AVATAR_BUCKET,
                    "public": True,
                    "file_size_limit": 5 * 1024 * 1024,
                    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif"],
                },
            )
        if response.is_error and response.status_code != 409:
            raise SupabaseRequestError(response.status_code, "ensure avatar bucket")

    def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> str:
        self.ensure_avatar_bucket()
        encoded_path = quote(path, safe="/")
        response = self._client.post(
            f"object/{bucket}/{encoded_path}",
            content=content,
            headers={"Content-Type": content_type, "x-upsert": "false"},
        )
        if response.is_error:
            raise SupabaseRequestError(response.status_code, "upload avatar")
        return f"{self._url}/storage/v1/object/public/{bucket}/{encoded_path}"

    def delete(self, bucket: str, paths: list[str]) -> None:
        if not paths:
            return
        response = self._client.request("DELETE", f"object/{bucket}", json={"prefixes": paths})
        if response.is_error and response.status_code != 404:
            raise SupabaseRequestError(response.status_code, "delete avatar")


def get_storage() -> Generator[ObjectStorage, None, None]:
    client = SupabaseStorageClient.from_environment()
    try:
        yield client
    finally:
        client.close()


Storage = Annotated[ObjectStorage, Depends(get_storage)]
