from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def test_health_works_standalone() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "python-api"


def test_health_works_through_vercel_prefix() -> None:
    response = client.get("/api/v2/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_minimum_payment_for_mercado_pago() -> None:
    response = client.post(
        "/pago-minimo",
        json={"saldo": 5000, "banco": "mercado_pago"},
    )
    assert response.status_code == 200
    assert response.json()["pago_minimo"] == 505.17


def test_custom_rate_is_required() -> None:
    response = client.post(
        "/pago-minimo",
        json={"saldo": 5000, "banco": "personalizado"},
    )
    assert response.status_code == 422
