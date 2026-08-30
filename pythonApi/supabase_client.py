"""Small server-only client for the Supabase Data API."""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any

import httpx


class SupabaseConfigurationError(RuntimeError):
    pass


class SupabaseRequestError(RuntimeError):
    def __init__(self, status_code: int, operation: str) -> None:
        super().__init__(f"Supabase Data API request failed during {operation}")
        self.status_code = status_code
        self.operation = operation


class SupabaseRestClient:
    def __init__(
        self,
        url: str,
        api_key: str,
        *,
        transport: httpx.BaseTransport | None = None,
        timeout: float = 10.0,
    ) -> None:
        if not url or not api_key:
            raise SupabaseConfigurationError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
            )
        headers = {
            "apikey": api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if not api_key.startswith("sb_secret_"):
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1/",
            headers=headers,
            timeout=timeout,
            transport=transport,
        )

    @classmethod
    def from_environment(cls) -> "SupabaseRestClient":
        return cls(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

    @property
    def headers(self) -> httpx.Headers:
        return self._client.headers

    def close(self) -> None:
        self._client.close()

    def select(
        self, table: str, params: Mapping[str, str] | None = None
    ) -> list[dict[str, Any]]:
        response = self._request("GET", table, params=params)
        return self._rows(response, f"select {table}")

    def insert(self, table: str, payload: Mapping[str, Any]) -> list[dict[str, Any]]:
        response = self._request(
            "POST", table, json=dict(payload), prefer="return=representation"
        )
        return self._rows(response, f"insert {table}")

    def update(
        self,
        table: str,
        payload: Mapping[str, Any],
        params: Mapping[str, str],
    ) -> list[dict[str, Any]]:
        response = self._request(
            "PATCH",
            table,
            params=params,
            json=dict(payload),
            prefer="return=representation",
        )
        return self._rows(response, f"update {table}")

    def delete(
        self, table: str, params: Mapping[str, str]
    ) -> list[dict[str, Any]]:
        response = self._request(
            "DELETE", table, params=params, prefer="return=representation"
        )
        return self._rows(response, f"delete {table}")

    def _request(
        self,
        method: str,
        table: str,
        *,
        params: Mapping[str, str] | None = None,
        json: Mapping[str, Any] | None = None,
        prefer: str | None = None,
    ) -> httpx.Response:
        try:
            response = self._client.request(
                method,
                table,
                params=params,
                json=json,
                headers={"Prefer": prefer} if prefer else None,
            )
        except httpx.HTTPError as exc:
            raise SupabaseRequestError(503, f"{method} {table}") from exc
        if response.is_error:
            raise SupabaseRequestError(response.status_code, f"{method} {table}")
        return response

    @staticmethod
    def _rows(response: httpx.Response, operation: str) -> list[dict[str, Any]]:
        if not response.content:
            return []
        payload = response.json()
        if not isinstance(payload, list):
            raise SupabaseRequestError(response.status_code, operation)
        return payload
