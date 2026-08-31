"""FastAPI endpoints migrated incrementally from the legacy backend."""

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

from auth_api import router as auth_router
from financial_core_api import router as financial_core_router
from supabase_client import SupabaseConfigurationError, SupabaseRequestError


PUBLIC_PREFIX = "/api/v2"
IVA = 0.16
BANKS: dict[str, dict[str, float | None]] = {
    "mercado_pago": {"annual_rate": 89.0, "balance_percentage": 1.5},
    "bbva": {"annual_rate": 55.0, "balance_percentage": 1.5},
    "banamex": {"annual_rate": 52.0, "balance_percentage": 1.25},
    "hsbc": {"annual_rate": 60.0, "balance_percentage": 1.5},
    "personalizado": {"annual_rate": None, "balance_percentage": 1.5},
}


class ServicePrefixMiddleware:
    """Strip the public Vercel Services prefix before FastAPI route matching."""

    def __init__(self, app: Any, prefix: str) -> None:
        self.app = app
        self.prefix = prefix
        self.prefix_bytes = prefix.encode()

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] in {"http", "websocket"}:
            path = scope.get("path", "")
            if path == self.prefix or path.startswith(f"{self.prefix}/"):
                scope = {
                    **scope,
                    "path": path[len(self.prefix) :] or "/",
                    "root_path": f"{scope.get('root_path', '')}{self.prefix}",
                }
                raw_path = scope.get("raw_path")
                if isinstance(raw_path, bytes) and raw_path.startswith(self.prefix_bytes):
                    scope["raw_path"] = raw_path[len(self.prefix_bytes) :] or b"/"
        await self.app(scope, receive, send)


class MinimumPaymentRequest(BaseModel):
    saldo: float = Field(..., gt=0, description="Saldo actual de la tarjeta en MXN")
    banco: str = Field("mercado_pago", description="Nombre del banco")
    tasa_anual_custom: float | None = Field(None, gt=0, le=200)

    @field_validator("banco")
    @classmethod
    def validate_bank(cls, value: str) -> str:
        if value not in BANKS:
            raise ValueError(f"Banco no soportado. Opciones: {list(BANKS)}")
        return value


class MinimumPaymentResponse(BaseModel):
    banco: str
    saldo: float
    tasa_anual: float
    tasa_mensual: float
    intereses: float
    iva_intereses: float
    porcion_saldo: float
    pago_minimo: float


app = FastAPI(
    title="MX Finanzas API",
    description="API Python para la migración incremental del backend financiero.",
    version="0.1.0",
)
app.add_middleware(ServicePrefixMiddleware, prefix=PUBLIC_PREFIX)
app.include_router(auth_router)
app.include_router(financial_core_router)


@app.exception_handler(SupabaseConfigurationError)
async def handle_supabase_configuration_error(
    _request: Any, _error: SupabaseConfigurationError
) -> Any:
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=503,
        content={"status": "error", "message": "Data service is not configured"},
    )


@app.exception_handler(SupabaseRequestError)
async def handle_supabase_request_error(
    _request: Any, _error: SupabaseRequestError
) -> Any:
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=502,
        content={"status": "error", "message": "Data service request failed"},
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "python-api", "version": "0.1.0"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "python-api", "version": "0.1.0"}


@app.get("/bancos")
def list_banks() -> dict[str, dict[str, dict[str, float | None]]]:
    return {"bancos": BANKS}


@app.post("/pago-minimo", response_model=MinimumPaymentResponse)
def calculate_minimum_payment(request: MinimumPaymentRequest) -> MinimumPaymentResponse:
    config = BANKS[request.banco]
    annual_rate = config["annual_rate"]
    if request.banco == "personalizado":
        if request.tasa_anual_custom is None:
            raise HTTPException(
                status_code=422,
                detail="Debes proporcionar tasa_anual_custom cuando banco='personalizado'",
            )
        annual_rate = request.tasa_anual_custom

    assert annual_rate is not None
    balance_percentage = config["balance_percentage"]
    assert balance_percentage is not None
    monthly_rate = annual_rate / 100 / 12
    interest = request.saldo * monthly_rate
    interest_tax = interest * IVA
    balance_portion = request.saldo * (balance_percentage / 100)

    return MinimumPaymentResponse(
        banco=request.banco,
        saldo=request.saldo,
        tasa_anual=annual_rate,
        tasa_mensual=round(monthly_rate * 100, 4),
        intereses=round(interest, 2),
        iva_intereses=round(interest_tax, 2),
        porcion_saldo=round(balance_portion, 2),
        pago_minimo=round(interest + interest_tax + balance_portion, 2),
    )
