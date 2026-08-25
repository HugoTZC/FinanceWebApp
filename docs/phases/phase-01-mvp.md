# Fase 1 — MVP: registro financiero y deudas de tarjeta

## Objetivo

Entregar una aplicación web funcional para que una persona pueda registrar ingresos y gastos, organizarlos por categorías y controlar las deudas asociadas con tarjetas de crédito.

## Resultado esperado

Al finalizar esta fase, el usuario podrá consultar un registro de sus movimientos y conocer cuánto debe en cada tarjeta de crédito.

## Alcance funcional

### Cuentas y medios de pago

- Crear, editar y archivar cuentas de débito.
- Crear, editar y archivar tarjetas de crédito.
- Registrar efectivo como medio de pago.
- Definir nombre, institución y saldo inicial de cada cuenta o tarjeta.

### Transacciones

- Registrar ingresos.
- Registrar gastos pagados con débito, crédito o efectivo.
- Asignar fecha, monto en pesos mexicanos, descripción y categoría.
- Crear y administrar categorías de ingresos y gastos.
- Consultar el historial de movimientos.

### Deudas de tarjeta de crédito

- Registrar compras hechas con una tarjeta.
- Ver el saldo pendiente por tarjeta.
- Registrar pagos a una tarjeta de crédito.
- Registrar fecha de corte y fecha límite de pago.
- Identificar compras a meses sin intereses o pagos diferidos, incluyendo número de mensualidades y saldo pendiente.

## Pantallas mínimas

- Resumen inicial: ingresos, gastos y deudas actuales.
- Movimientos: listado y formulario para crear o editar transacciones.
- Cuentas y tarjetas: administración de medios de pago.
- Deudas: detalle del saldo y pagos por tarjeta.
- Categorías: administración de categorías.

## Datos mínimos por registrar

| Entidad | Datos principales |
| --- | --- |
| Cuenta o tarjeta | Tipo, nombre, institución, saldo inicial y estado. |
| Transacción | Tipo, monto, fecha, descripción, categoría y medio de pago. |
| Deuda de tarjeta | Tarjeta, saldo pendiente, fecha de corte, fecha límite y pagos registrados. |
| Compra diferida | Tarjeta, monto original, mensualidades, mensualidad actual y saldo pendiente. |

## Criterios de aceptación

- Un ingreso, gasto o pago de tarjeta puede guardarse y aparecer en el historial.
- Un gasto con tarjeta aumenta la deuda asociada.
- Un pago de tarjeta disminuye la deuda asociada.
- El usuario puede filtrar movimientos por categoría y medio de pago.
- Los montos se muestran en pesos mexicanos.

## Fuera de alcance

- Sincronización bancaria automática.
- Cálculo automatizado de intereses bancarios.
- Presupuestos, alertas y proyecciones.
- Machine learning y recomendaciones.

## Referencias

- Documento maestro: [PDR](../PDR.md).

## Avance de implementación — FastAPI 0.2.0

Primera rebanada migrada y cubierta por pruebas de contrato:

- CRUD de cuentas bancarias y balance histórico mensual.
- Lectura combinada de categorías y CRUD de categorías propias.
- Lectura, filtrado, paginación, detalle y años de transacciones.
- CRUD de tarjetas de crédito y lectura de sus movimientos.
- Compatibilidad con el JWT emitido por Express y ownership server-side.

El corte está disponible únicamente en `/api/v2`. Las escrituras de
transacciones y pagos que modifican saldos siguen en Express porque requieren
una operación atómica entre movimiento, cuenta y deuda de tarjeta. También
siguen en Express autenticación, usuarios, préstamos, presupuestos, ahorros y
notificaciones.

Antes de dirigir el frontend a FastAPI se requiere:

1. completar la rotación pendiente de la clave Supabase de Preview;
2. validar el despliegue Preview de punta a punta;
3. implementar una transacción atómica para movimientos y ajustes de saldo;
4. comparar respuestas Express/FastAPI con datos de prueba del mismo usuario.
