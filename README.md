# MX Finanzas Personal

Aplicación de finanzas personales enfocada en México. El frontend existente se conserva en Next.js y el backend se migra de Express a FastAPI de forma incremental.

## Arquitectura de despliegue

El repositorio se publica como **un solo proyecto de Vercel Services y un solo dominio**:

- `/` → `frontEnd/` (Next.js).
- `/api/*` → `backEnd/` (Express legado durante la migración).
- `/api/v2/*` → `pythonApi/` (FastAPI).
- Express llama a FastAPI mediante un service binding privado (`PYTHON_API_URL`).

La primera rebanada del MVP ya está disponible en `/api/v2` con contratos de
respuesta compatibles para cuentas, categorías, lectura de transacciones y
tarjetas de crédito. El frontend continúa en `/api` hasta completar la rotación
de credenciales y validar Preview; no se ha cambiado tráfico de producción.

La configuración está en `vercel.json`. En Vercel, el Framework Preset del proyecto debe ser **Services**.

## Desarrollo local separado

```powershell
# Terminal 1
cd frontEnd
npm install
npm run dev

# Terminal 2
cd backEnd
npm install
npm run dev

# Terminal 3
cd pythonApi
python -m pip install -r requirements-dev.txt
$env:SUPABASE_URL="<local-only>"
$env:SUPABASE_SERVICE_ROLE_KEY="<local-only>"
$env:JWT_SECRET="<local-only>"
python -m uvicorn app:app --reload --port 8000
```

En Linux/macOS también se pueden levantar los tres componentes desde la raíz con `vercel dev -L`. Vercel CLI 59.5.0 tiene actualmente un fallo local en Windows al generar rutas Python sin escapar; usa los tres procesos separados o WSL hasta que se corrija.

> No ejecutes `next build` mientras `next dev` esté usando el mismo directorio `frontEnd/.next`; detén el servidor de desarrollo primero o usa una copia aislada.

## Variables requeridas en Vercel

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NODE_ENV=production`

No configures `NEXT_PUBLIC_API_URL` en producción: el frontend usa `/api` en el mismo dominio. Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` con un prefijo `NEXT_PUBLIC_`.

## Verificación

```powershell
cd pythonApi
python -m pytest

cd ..\frontEnd
npm run build

cd ..\backEnd
npm test -- --runInBand
```

La verificación actual cubre la salud del backend legado y 14 casos de FastAPI,
incluidos autenticación, ownership, contratos financieros y encabezados seguros
para claves Supabase modernas. El frontend también se valida con TypeScript
durante `next build`.

### Rutas migradas en modo de revisión

- Cuentas: CRUD y lectura de historial mensual.
- Categorías: lectura combinada y CRUD de categorías de usuario.
- Transacciones: listado filtrado/paginado, detalle y años disponibles.
- Tarjetas: CRUD y lectura de movimientos por tarjeta.
- Deuda: cálculo de pago mínimo ya existente en FastAPI.

Las escrituras de transacciones, pagos que ajustan saldos, préstamos,
presupuestos, ahorros, notificaciones, usuarios y autenticación permanecen en
Express hasta que cada rebanada tenga pruebas de consistencia y rollback.

## Documentación de producto

- [PDR](docs/PDR.md)
- [Fase 1 — MVP](docs/phases/phase-01-mvp.md)
- [Auditoría técnica](docs/audit-2026-08-24.md)
