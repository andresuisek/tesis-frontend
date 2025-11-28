# Guía de módulos para usuarios

Este documento resume qué puede hacer cada tipo de usuario dentro de la plataforma y enlaza directamente con los módulos disponibles. Puedes abrir cualquier enlace en una nueva pestaña o navegar desde el sidebar de la aplicación.

> Tip: Si necesitas ayuda contextual dentro de la app, abre el **Agente Inteligente** (botón flotante) y pregunta en lenguaje natural. El agente ejecutará las consultas por ti y mostrará los resultados en un lenguaje sencillo.

## Dashboard [`/dashboard`](http://localhost:3000/dashboard)

- **Objetivo:** visión general del desempeño tributario.
- **Qué puedes hacer:**
  1. Filtrar por periodo fiscal usando el selector de mes/año.
  2. Revisar métricas clave (ventas, compras, IVA, retenciones).
  3. Analizar gráficos de flujo mensual y distribución de impuestos.
  4. Revisar actividad reciente y próximos vencimientos.

## Ventas [`/modules/ventas`](http://localhost:3000/modules/ventas)

- **Objetivo:** registrar y controlar facturas emitidas.
- **Qué puedes hacer:**
  1. Crear una venta desde **“Nueva venta”** indicando comprobante y montos.
  2. Asociar notas de crédito o retenciones mediante los diálogos rápidos.
  3. Filtrar por rango de fechas, tipo de comprobante o clave de acceso.
  4. Exportar o copiar detalles para reportes contables.

## Compras [`/modules/compras`](http://localhost:3000/modules/compras)

- **Objetivo:** administrar comprobantes de proveedores y gastos deducibles.
- **Qué puedes hacer:**
  1. Registrar una compra manual o importar archivos del SRI.
  2. Clasificar el gasto por rubro para facilitar deducciones.
  3. Revisar KPI de gastos personales y tablas con filtros avanzados.
  4. Preparar información para liquidaciones mensuales.

## Retenciones [`/modules/retenciones`](http://localhost:3000/modules/retenciones)

- **Objetivo:** gestionar comprobantes de retención emitidos.
- **Qué puedes hacer:**
  1. Registrar retenciones asociadas a ventas o servicios.
  2. Calcular porcentajes para IVA y Renta automáticamente.
  3. Filtrar por serie, fechas y clave de acceso.
  4. Obtener detalle individual desde el diálogo contextual.

## Notas de crédito [`/modules/notas-credito`](http://localhost:3000/modules/notas-credito)

- **Objetivo:** controlar notas de crédito generadas por devoluciones o ajustes.
- **Qué puedes hacer:**
  1. Cargar notas de crédito indicando el comprobante relacionado.
  2. Validar subtotales e IVA antes de guardar.
  3. Visualizar el histórico y su impacto en ventas.

## Liquidación [`/modules/liquidacion`](http://localhost:3000/modules/liquidacion)

- **Objetivo:** generar liquidaciones y cierres tributarios.
- **Qué puedes hacer:**
  1. Crear liquidaciones mensuales desde el diálogo “Generar liquidación”.
  2. Registrar ingresos manuales o ajustes específicos.
  3. Generar cierres y descargar resúmenes para el SRI.
  4. Revisar KPIs comparativos y tablas de control.

## Registro RUC [`/modules/registro-ruc`](http://localhost:3000/modules/registro-ruc)

- **Objetivo:** validar información de contribuyentes.
- **Qué puedes hacer:**
  1. Consultar datos de RUC y actividades económicas.
  2. Guardar cambios básicos (dirección, contactos) según permisos.

## Usuarios [`/modules/usuarios`](http://localhost:3000/modules/usuarios)

- **Objetivo:** administrar cuentas y permisos.
- **Qué puedes hacer:**
  1. Añadir o desactivar usuarios internos.
  2. Definir roles y restringir acceso por módulos.
  3. Revisar actividad y mantener auditoría básica.

## Chatbot / Agente [`/modules/chatbot`](http://localhost:3000/modules/chatbot)

- **Objetivo:** vista dedicada al asistente inteligente.
- **Qué puedes hacer:**
  1. Revisar conversaciones históricas y reabrir consultas.
  2. Configurar prompts sugeridos para tu equipo.
  3. Enlazar respuestas con reportes o dashboards.

## Buenas prácticas generales

- Mantén tu **contribuyente_ruc** actualizado para que los filtros automáticos funcionen.
- Utiliza el botón **“Generar reporte”** del dashboard para exportar métricas resumidas.
- El agente ejecuta las consultas por ti y solo muestra resultados amigables; valida que la información tenga sentido antes de usarla en tus reportes.
- Si necesitas orientación paso a paso, vuelve a este documento o consulta al agente con preguntas como _“¿Cómo registro una nueva retención?”_.
