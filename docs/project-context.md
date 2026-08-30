# Contexto operativo de FinanceWebApp

Este documento concentra las decisiones y el estado verificable del proyecto. Su propósito es permitir que futuras tareas trabajen desde el repositorio sin depender de conversaciones anteriores. No debe contener credenciales, tokens, datos financieros ni datos personales.

## Propósito del producto

FinanceWebApp es una aplicación personal de finanzas para registrar ingresos, gastos, cuentas, tarjetas de crédito, presupuestos y metas de ahorro. La prioridad actual es capturar datos confiables y mantener una separación estricta entre usuarios antes de incorporar automatizaciones e integraciones.

## Arquitectura acordada

- `frontEnd/`: Next.js; interfaz web y cliente de la API.
- `backEnd/`: Express; API transitoria, autenticación propia con JWT y acceso de servidor a Supabase.
- `pythonApi/`: FastAPI; destino de la migración incremental del backend, actualmente bajo `/api/v2`.
- `supabase/`: migraciones de PostgreSQL y controles de acceso.
- `vercel.json`: un proyecto Vercel Services que publica los tres servicios bajo el mismo dominio.

La migración es incremental: Express permanece activo mientras los dominios se trasladan a FastAPI. No se retirará Express hasta que las rutas y pruebas equivalentes estén cubiertas.

## Decisiones de seguridad

- La clave de servicio de Supabase es exclusivamente de servidor y nunca puede usar el prefijo `NEXT_PUBLIC_`.
- Las tablas financieras del esquema `public` tienen RLS habilitado y los roles `anon` y `authenticated` no reciben acceso directo. La API transitoria usa `service_role`, por lo que cada operación debe autenticar al usuario y filtrar por `user_id` en el servidor.
- La autenticación actual es propia de Express mediante JWT; todavía no es Supabase Auth.
- Los secretos de producción viven en Vercel, no en archivos rastreados por Git.
- No se publican cambios si faltan RLS, autenticación, secretos de servidor o verificaciones de CI.

## Modelo financiero confirmado

- Un pago a tarjeta de crédito no es ingreso ni crea liquidez.
- El pago disminuye la cuenta o efectivo de origen y también disminuye la deuda de la tarjeta.
- El crédito disponible no se suma al dinero líquido.
- El backend debe impedir pagos superiores a la deuda vigente y validar que la tarjeta pertenezca al usuario autenticado.

## Estado de ramas al 30 de agosto de 2026

- La preparación de Vercel Services ya fue fusionada a `main` mediante revisión normal.
- `main` incluye además controles de CI y mejoras posteriores para navegación móvil.
- La rama `ui/shadcn-dashboard-overhaul` contiene trabajo de interfaz y la corrección contable de pagos de tarjeta que todavía debe revisarse como una entrega separada; no se mezcla automáticamente con una publicación de infraestructura.
- La rama `review/security-production-python-mvp` contiene una migración más amplia de lecturas a FastAPI y tampoco forma parte automática del alcance de producción actual.

## Evidencia operativa vigente

- El proyecto remoto de Supabase está activo y saludable.
- La migración remota `secure_public_schema_server_only_rls` está registrada.
- Las 15 tablas de `public` tienen RLS habilitado y no tienen políticas de acceso directo.
- Los roles `anon` y `authenticated` reciben `permission denied` al intentar leer transacciones, mientras los datos permanecen disponibles para el backend de servidor.
- Los asesores de seguridad únicamente señalan que las tablas con RLS no tienen políticas —esperado para el modelo server-only— y que la protección de contraseñas filtradas de Supabase Auth está deshabilitada; esta última no protege todavía la autenticación propia de Express.
- El despliegue de producción responde en la API Express, rechaza rutas protegidas sin sesión y responde en FastAPI.

## Pendientes antes de considerar estable la captura de datos reales

1. Confirmar por nombre y entorno que Vercel Production contiene `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` y `JWT_REFRESH_SECRET`, sin exponerlos al cliente.
2. Mantener una prueba de integración que demuestre que un usuario no puede leer ni modificar filas de otro usuario a través de la API Express.
3. Decidir cuándo migrar de autenticación propia a Supabase Auth y reemplazar el esquema server-only con políticas por propietario basadas en `auth.uid()`.
4. Migrar avatares a almacenamiento persistente antes de habilitar nuevas cargas en producción.
5. Revisar y fusionar por separado las ramas funcionales pendientes, especialmente la corrección de pagos de tarjeta.

## Fuentes canónicas

- Producto y arquitectura: `docs/PDR.md` y `docs/phases/phase-01-mvp.md`.
- Historial de riesgos: `docs/audit-2026-08-24.md`.
- Configuración de despliegue: `vercel.json` y `.github/workflows/ci.yml`.
- Seguridad de base de datos: `supabase/migrations/`.

Cuando una conversación produzca una decisión duradera, debe actualizarse el documento canónico correspondiente y este resumen solo si cambia el estado operativo general.
