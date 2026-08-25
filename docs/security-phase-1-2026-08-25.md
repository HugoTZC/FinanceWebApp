# Fase 1: baseline de seguridad de Supabase

Fecha: 2026-08-25

## Estado verificado antes de la migración

- El acceso MCP al proyecto remoto funcionó y permitió inspeccionar tablas,
  migraciones, privilegios y Advisors.
- Las 15 tablas de `public` tenían RLS desactivado.
- Los roles `anon` y `authenticated` tenían privilegios de lectura y escritura
  sobre todas las tablas de `public`.
- El esquema duplicado `finance` no concedía privilegios a esos roles y no es
  el esquema utilizado por la aplicación.
- La aplicación autentica usuarios en `public.users` y usa una clave secreta
  server-side para el Data API. `public.users` no está enlazada a `auth.users`;
  los usuarios existentes tampoco comparten ID ni correo.

## Decisión de seguridad

La política `auth.uid() = user_id` preparada inicialmente no representaba la
identidad real de la aplicación. Además, conceder acceso directo a
`public.users` habría expuesto su columna `password_hash` a una superficie que
el frontend no necesita.

Se cambió el baseline a un modelo server-only temporal:

- revocar todos los privilegios de tablas, secuencias y esquema a `anon` y
  `authenticated`;
- revocar esos mismos privilegios por defecto para objetos nuevos;
- habilitar RLS en las 15 tablas de `public` sin políticas de acceso directo;
- mantener `service_role` para el backend mientras la autenticación siga siendo
  propia;
- conservar índices de ownership y claves foráneas necesarios para la API.

El acceso directo con Supabase Auth solo debe habilitarse en una migración
posterior que unifique identidades, elimine el almacenamiento propio de hashes
de contraseña y añada pruebas de ownership por usuario.

## Aplicación y verificación remota

- Migración aplicada: `20260825154013 secure_public_schema_server_only_rls`.
- RLS: 15 de 15 tablas `public` habilitadas.
- Políticas directas: 0, intencionalmente.
- Prueba como `anon`: `permission denied`.
- Prueba como `authenticated`: `permission denied`.
- Prueba como `service_role`: lectura correcta.
- Security Advisor: sin errores de RLS desactivado ni exposición GraphQL
  anónima. Permanecen 15 avisos informativos `rls_enabled_no_policy` y la
  recomendación de activar protección contra contraseñas filtradas en Auth.

## Pendiente obligatorio antes de producción

1. Crear una nueva clave `sb_secret` y reemplazar la clave heredada expuesta.
2. Rotar `JWT_SECRET` y `JWT_REFRESH_SECRET` del backend.
3. Actualizar únicamente el entorno Preview y validarlo de extremo a extremo.
4. Deshabilitar las claves JWT heredadas después de confirmar que ningún
   servicio sigue usándolas.
5. Crear valores independientes para Production; nunca reutilizar los de
   Preview.

No se debe promover ningún despliegue hasta completar los cinco puntos.
