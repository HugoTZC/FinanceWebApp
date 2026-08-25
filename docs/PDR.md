# PDR — MX Finanzas Personal

## Propósito

Crear una aplicación personal de finanzas diseñada para el contexto mexicano. Su objetivo inicial es registrar y entender ingresos, gastos y deudas, con atención especial al uso de tarjetas de crédito, débito y efectivo.

El producto deberá construir un historial financiero consistente que, en fases futuras, permita analizar hábitos y aplicar modelos de aprendizaje automático para identificar patrones, alertas y proyecciones.

## Usuarios iniciales

- Usuario individual en México que desea centralizar su control financiero personal.
- Persona que usa efectivo, cuentas de débito y una o más tarjetas de crédito.

## Principios del producto

- Pesos mexicanos como moneda inicial.
- Las tarjetas de crédito se modelan como deuda y no solo como una cuenta de gasto.
- Los datos deben ser claros, editables y trazables.
- La primera versión privilegia registros confiables antes que automatizaciones o recomendaciones.

## Tecnologías acordadas

| Área | Tecnología | Responsabilidad |
| --- | --- | --- |
| Interfaz | React con Next.js | Aplicación web para capturar y consultar información financiera. |
| Backend objetivo | Python con FastAPI | API y reglas de negocio; base futura para análisis y machine learning. |
| Backend transitorio | Express/Node.js | Conserva las rutas existentes mientras se migran a FastAPI. |
| Base de datos y autenticación | Supabase | Persistencia y migración gradual hacia Supabase Auth. |
| Hosting | Vercel Services | Un despliegue y dominio para Next.js, FastAPI y el backend transitorio. |
| Organización | Monorepo | Un repositorio para interfaz, APIs, documentación y configuración. |

## Fases previstas

| Fase | Nombre | Estado | Documento |
| --- | --- | --- | --- |
| 1 | MVP: registro financiero y deudas de tarjeta | Definida | [Fase 1](phases/phase-01-mvp.md) |
| 2 | Resúmenes, presupuestos y calendario de pagos | Por definir | Pendiente |
| 3 | Automatización, importación y notificaciones | Por definir | Pendiente |
| 4 | Análisis de patrones y machine learning | Por definir | Pendiente |

## Alcance fuera de la Fase 1

- Conexión automática con bancos.
- Declaraciones fiscales o contabilidad profesional.
- Recomendaciones automatizadas y modelos de machine learning.
- Soporte para múltiples monedas.
