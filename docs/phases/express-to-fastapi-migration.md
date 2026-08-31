# Plan por fases: retirar Express y completar FastAPI

## Objetivo

Trasladar todas las capacidades de `backEnd/` a `pythonApi/`, conservar los contratos que usa el frontend y retirar Express únicamente cuando FastAPI cubra autenticación, lecturas, escrituras y reglas financieras con pruebas de aislamiento por usuario.

## Estado de partida

- Vercel Services ya publica Next.js, Express y FastAPI en un solo proyecto.
- `/api` apunta a Express y `/api/v2` apunta a FastAPI.
- FastAPI en `main` expone salud, catálogo de bancos y cálculo de pago mínimo; todavía no atiende datos financieros persistentes.
- La rama `review/security-production-python-mvp` contiene una base reutilizable con 23 endpoints para cuentas, categorías, tarjetas y lecturas de transacciones, además de autenticación compatible con el JWT actual y pruebas de pertenencia por usuario.
- Express sigue siendo responsable de autenticación, perfiles, transacciones completas, presupuestos, préstamos, ahorros, pagos recurrentes, notificaciones, dashboard y análisis.

## Avance actual

- La autenticación de FastAPI ya está implementada y probada en la rama de trabajo: registro, login, logout con revocación, refresh con rotación, usuario actual, cambio de contraseña y tokens de restablecimiento.
- Conserva compatibilidad temporal con los JWT emitidos por Express.
- Incluye una migración aditiva para marcas de contraseña y sesiones renovables revocables.
- La migración aún no se aplica a la base remota y el código no se despliega hasta rotar las claves históricas.
- La entrega por correo del enlace de recuperación requiere seleccionar y configurar un proveedor transaccional; el token nunca se devuelve ni se registra.

La rama avanzada debe tratarse como fuente de cambios seleccionados. No debe fusionarse completa porque quedó atrás de `main` y mezcla API, interfaz, documentación, CI y una versión anterior de la migración RLS.

## Principios de migración

1. Mantener `/api` estable para el frontend durante la transición.
2. Migrar por dominio y comparar respuestas de Express y FastAPI antes de cambiar tráfico.
3. Todas las operaciones persistentes deben derivar `user_id` de la sesión; nunca aceptarlo como autoridad desde el cuerpo o la URL.
4. Toda lectura, actualización y eliminación debe probar que una sesión no puede acceder a filas de otro usuario.
5. No registrar tokens, contraseñas, claves ni datos financieros completos.
6. Rotar las credenciales expuestas antes de habilitar datos reales; el corte puede invalidar sesiones existentes y exigir un nuevo inicio de sesión.
7. Express se elimina solo después de un periodo de observación con FastAPI como API principal y una ruta de reversión comprobada.

## Fase 0 — Seguridad y contrato base

**Alcance**

- Rotar la clave privilegiada de Supabase y `JWT_SECRET`/`JWT_REFRESH_SECRET`.
- Actualizar únicamente Vercel Production y los entornos de desarrollo autorizados.
- Definir modelos compartidos de error, paginación, fechas, importes y respuestas para que FastAPI sea compatible con el frontend actual.
- Añadir pruebas de contrato contra Express para capturar el comportamiento que debe conservarse.
- Acordar la estrategia de autenticación del retiro de Express: JWT propio compatible en FastAPI para el corte inicial; Supabase Auth queda como migración posterior y explícita.

**Salida verificable**

- Las claves históricas dejan de funcionar.
- CI no contiene credenciales y pasa en Linux.
- Las rutas protegidas devuelven 401 sin sesión y no filtran detalles internos.
- Existe una matriz ruta por ruta con método, contrato, responsable y estado.

## Fase 1 — Base segura de FastAPI

**Alcance**

- Extraer de la rama avanzada el cliente de Supabase, dependencias de autenticación, manejo de errores y pruebas, sin traer cambios antiguos ajenos.
- Verificar JWT de acceso y refresco, existencia del usuario y cambio de contraseña.
- Añadir configuración tipada, timeouts, reutilización de conexiones HTTP y logs sanitizados.
- Introducir pruebas de integración con dos usuarios y datos separados.

**Salida verificable**

- FastAPI autentica las mismas sesiones que Express durante la convivencia.
- Cada prueba CRUD incluye casos propio, ajeno, inexistente y sin sesión.
- La clave de servicio solo existe en el proceso de servidor.

## Fase 2 — Núcleo financiero

**Rutas a migrar**

- Cuentas: CRUD e historial. Implementado y cubierto por pruebas en FastAPI.
- Categorías: predeterminadas, combinadas y CRUD de categorías del usuario. Implementado y cubierto por pruebas en FastAPI.
- Tarjetas: CRUD, gasto total, gasto por categoría y gasto mensual. Implementado y cubierto por pruebas en FastAPI.
- Transacciones: listado, detalle, años, resumen mensual, categorías, movimientos por tarjeta y CRUD completo.
- Préstamos: CRUD.

**Reglas críticas**

- Crear, editar y eliminar transacciones debe mantener saldos de cuentas y tarjetas de forma atómica o compensable.
- Un pago de tarjeta reduce liquidez y deuda; nunca cuenta como ingreso.
- No se permite pagar más que la deuda ni usar una cuenta o tarjeta de otro usuario.

**Salida verificable**

- Paridad de respuestas con Express para el frontend actual.
- Pruebas de regresión para ingreso, gasto, compra con crédito, pago de tarjeta, depósito a ahorro y reversión por edición/eliminación.
- El frontend puede dirigir estos dominios a `/api/v2` mediante una opción de despliegue reversible.

## Fase 3 — Planificación, ahorro y comunicación

**Rutas a migrar**

- Presupuestos, categorías presupuestarias y alertas.
- Metas de ahorro y progreso.
- Pagos recurrentes y progreso.
- Notificaciones: listado, marcar una, marcar todas, eliminar una y limpiar todas.

**Salida verificable**

- Las alertas y progresos coinciden con Express usando escenarios de fechas límite y cambio de mes.
- Todas las escrituras están limitadas al propietario.
- No quedan rutas de estos dominios atendidas únicamente por Express.

## Fase 4 — Perfil, configuración y archivos

**Rutas a migrar**

- Perfil del usuario.
- Configuración general y preferencias de notificación.
- Cambio y eliminación de cuenta.
- Avatar.

**Trabajo previo obligatorio**

- Sustituir el filesystem efímero de Vercel por Supabase Storage u otro almacenamiento persistente.
- Validar tipo, tamaño y nombre de archivos; usar rutas por usuario y políticas de acceso específicas.

**Salida verificable**

- El avatar persiste entre despliegues.
- Actualizaciones y eliminación de cuenta tienen pruebas de autorización y limpieza de recursos.

## Fase 5 — Dashboard y análisis

**Rutas a migrar**

- Resumen del dashboard, datos mensuales, categorías y transacciones recientes.
- Análisis de presupuesto, semana, vencimientos, obligaciones y balance mensual.

**Enfoque**

- Reutilizar servicios del núcleo financiero en lugar de duplicar consultas.
- Comparar resultados sobre un conjunto fijo de datos y documentar reglas de redondeo, zona horaria y moneda.

**Salida verificable**

- Los totales de FastAPI coinciden con los casos contables aprobados.
- Se eliminan los fallbacks que ocultan errores devolviendo ceros o listas vacías.

## Fase 6 — Autenticación completa en FastAPI

**Rutas a migrar**

- Registro, inicio y cierre de sesión.
- Renovación de tokens.
- Usuario actual y cambio de contraseña.
- Recuperación y restablecimiento de contraseña.

**Controles**

- Cookies `HttpOnly`, `Secure` y política `SameSite` documentada.
- Renovación con rotación o revocación del refresh token.
- Respuesta uniforme para recuperación de contraseña, sin revelar si existe una cuenta.
- Envío del enlace mediante proveedor de correo; nunca devolver el token por HTTP ni logs.
- Rate limiting compartido y no dependiente de memoria de una instancia.

**Salida verificable**

- Todo el ciclo de sesión funciona sin Express.
- Las claves antiguas y sesiones emitidas con ellas son rechazadas.
- Pruebas de expiración, refresh, cambio de contraseña, usuario eliminado y token manipulado.

## Fase 7 — Corte de tráfico y retiro de Express

**Secuencia**

1. Ejecutar la suite completa contra Preview con datos de prueba no sensibles.
2. Dirigir temporalmente el frontend a FastAPI y observar errores, latencia y diferencias de contrato.
3. Cambiar `/api` para que apunte a FastAPI; mantener Express desplegado pero sin tráfico como reversión breve.
4. Confirmar login, dashboard y un CRUD de cada dominio en producción.
5. Observar logs y errores durante el periodo acordado.
6. Eliminar el servicio `legacy_api`, su binding, dependencias, código y variables exclusivas.
7. Actualizar documentación y marcar Express como retirado.

**Salida verificable**

- Cero solicitudes normales llegan a Express.
- No quedan importaciones, scripts, pruebas ni configuración que dependan de `backEnd/`.
- Vercel publica únicamente Next.js y FastAPI.
- Existe una versión de producción anterior identificada para rollback.

## Orden recomendado de entregas

| Entrega | Resultado | Riesgo principal |
| --- | --- | --- |
| A | Fases 0–1 | Secretos y compatibilidad de sesión |
| B | Fase 2 | Integridad contable y aislamiento por usuario |
| C | Fases 3–4 | Fechas, alertas y almacenamiento persistente |
| D | Fases 5–6 | Paridad analítica y ciclo completo de autenticación |
| E | Fase 7 | Corte de tráfico y rollback |

Cada entrega debe ser un PR pequeño, revisable y desplegable en Preview. No debe combinarse con rediseños de interfaz ni con cambios de datos no indispensables para ese dominio.

## Definición global de terminado

- Todas las rutas utilizadas por el frontend tienen implementación FastAPI y prueba de contrato.
- Todas las rutas persistentes tienen pruebas con dos usuarios que demuestran aislamiento.
- CI, build, pruebas y asesores de seguridad pasan sin hallazgos críticos.
- Los secretos históricos están revocados.
- La API principal funciona durante el periodo de observación sin depender de Express.
- `backEnd/` y `legacy_api` se eliminan en un PR final reversible.
