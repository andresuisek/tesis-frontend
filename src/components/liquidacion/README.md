# Módulo de Liquidación de Impuestos

## Descripción

Este módulo permite a los contribuyentes calcular y gestionar sus liquidaciones de IVA de forma automática o manual, siguiendo las normativas tributarias ecuatorianas.

## Estructura de Archivos

### Componentes

1. **liquidaciones-table.tsx**
   - Tabla para mostrar el historial de liquidaciones
   - Muestra período, tipo (mensual/semestral), valores de IVA, créditos y el impuesto a pagar
   - Acciones: Ver detalle, descargar y eliminar

2. **generar-cierre-dialog.tsx**
   - Modal para generar liquidación automática
   - Consulta automáticamente ventas, compras, notas de crédito y retenciones del período
   - Implementa la lógica de cálculo según el diagrama de flujo
   - Muestra un resumen completo antes de guardar

3. **ingreso-manual-dialog.tsx**
   - Modal para ingreso manual de liquidación
   - Permite ingresar todos los valores manualmente
   - Calcula automáticamente el impuesto a pagar
   - Muestra un resumen antes de confirmar

### Página Principal

**page.tsx**
- Vista principal del módulo
- Muestra KPIs: Total a pagar, saldo a favor, IVA causado, crédito tributario
- Listado de todas las liquidaciones
- Botones para crear nueva liquidación (automática o manual)

## Lógica de Cálculo

El cálculo sigue el siguiente flujo basado en las normativas del SRI:

1. **Separación de transacciones por IVA**
   - Compras: IVA = 0% e IVA > 0%
   - Ventas: IVA = 0% e IVA > 0%

2. **Cálculo de IVA Causado**
   - IVA de ventas - Notas de crédito

3. **Aplicación de Créditos Tributarios**
   - Crédito por adquisición (IVA de compras)
   - Crédito por retenciones de IVA

4. **Impuesto a Pagar al SRI**
   - IVA Causado - Crédito por Adquisición - Crédito por Retención
   - Si es positivo: Impuesto a pagar
   - Si es negativo: Saldo a favor del contribuyente

## Tipos de Liquidación

### Mensual
- Para contribuyentes con obligación mensual
- Se calcula por cada mes del año
- Período: Primer día al último día del mes

### Semestral
- Para contribuyentes con obligación semestral
- Se calcula por semestre
- Primer semestre: Enero - Junio
- Segundo semestre: Julio - Diciembre

## Base de Datos

La información se almacena en la tabla `tax_liquidations` con los siguientes campos:

- `id`: UUID (PK)
- `contribuyente_ruc`: Referencia al contribuyente
- `fecha_inicio_cierre`: Fecha de inicio del período
- `fecha_fin_cierre`: Fecha de fin del período
- `total_compras_iva_0`: Total de compras con IVA 0%
- `total_compras_iva_mayor_0`: Total de compras con IVA > 0%
- `total_ventas_iva_0`: Total de ventas con IVA 0%
- `total_ventas_iva_mayor_0`: Total de ventas con IVA > 0%
- `total_nc_iva_mayor_0`: Total de notas de crédito (IVA)
- `total_retenciones_iva_mayor_0`: Total de retenciones de IVA
- `credito_favor_adquisicion`: Crédito tributario por compras
- `credito_favor_retencion`: Crédito por retenciones
- `impuesto_causado`: Impuesto causado calculado
- `impuesto_pagar_sri`: Impuesto final a pagar (o saldo a favor si es negativo)
- `created_at`: Fecha de creación
- `deleted_at`: Fecha de eliminación (soft delete)

## Uso

### Crear Liquidación Automática

1. Clic en "Nueva Liquidación" → "Generar Automático"
2. Seleccionar año y mes/semestre
3. Clic en "Calcular Liquidación"
4. Revisar el resumen
5. Clic en "Guardar Liquidación"

**Validaciones aplicadas:**
- ❌ No permite crear cierre del período actual (mes/semestre en curso)
- ❌ Bloquea si el período anterior tiene datos sin liquidar
- ⚠️ Advierte pero permite si el período anterior no tiene datos ni cierre
- ❌ No permite duplicar cierres para el mismo período

### Crear Liquidación Manual

1. Clic en "Nueva Liquidación" → "Ingreso Manual"
2. Seleccionar año y mes/semestre
3. Ingresar manualmente los valores:
   - Ventas (IVA 0% e IVA > 0%)
   - Compras (IVA 0% e IVA > 0%)
   - Créditos tributarios
   - Ajustes (notas de crédito y retenciones)
4. Clic en "Ver Resumen"
5. Revisar y confirmar
6. Clic en "Confirmar y Guardar"

**Validaciones aplicadas:**
- ❌ No permite crear cierre del período actual (mes/semestre en curso)
- ❌ No permite duplicar cierres para el mismo período
- ✅ **SÍ permite** crear cierres sin que exista el período anterior (más flexible)

## Características

- ✅ Cálculo automático basado en transacciones registradas
- ✅ Ingreso manual de liquidaciones
- ✅ Resumen detallado antes de guardar
- ✅ Historial completo de liquidaciones
- ✅ KPIs en tiempo real
- ✅ Soporte para obligaciones mensuales y semestrales
- ✅ Validación de períodos
- ✅ **Validación de secuencia de cierres** (no permite saltar períodos)
- ✅ **Prevención de cierre del período actual** (debe haber finalizado)
- ✅ Eliminación lógica (soft delete)
- ✅ Formato de moneda ecuatoriana (USD)

## Validaciones de Negocio

### Generación Automática

1. **Período Finalizado**: No se puede generar un cierre del período actual. El sistema verifica que la fecha de fin del período sea anterior al día actual.

2. **Validación de Datos del Período Anterior**:
   - **Si existe cierre anterior**: ✅ Permite continuar normalmente
   - **Si NO existe cierre anterior**:
     - **CON datos registrados** (ventas, compras, notas de crédito o retenciones): ❌ **BLOQUEA** - "El período anterior tiene X registro(s) sin liquidar"
     - **SIN datos registrados**: ⚠️ **ADVERTENCIA** pero permite continuar - "Se asume que no hubo operaciones en ese período"
   
   Esta validación inteligente asegura que:
   - No se salten períodos con operaciones sin liquidar
   - Se permita avanzar cuando un período no tuvo actividad comercial

3. **No Duplicados**: No permite crear un cierre si ya existe uno para el mismo período.

### Ingreso Manual

1. **Período Finalizado**: No se puede generar un cierre del período actual (igual que automático).

2. **Flexibilidad**: **SÍ permite** crear cierres sin que exista el período anterior. Esto es útil para:
   - Iniciar registros contables
   - Corregir períodos faltantes
   - Ingresar datos históricos

3. **No Duplicados**: No permite crear un cierre si ya existe uno para el mismo período.

## Futuras Mejoras

- [ ] Exportación a PDF
- [ ] Generación de formularios del SRI (104, 103)
- [ ] Comparación entre períodos
- [ ] Notificaciones de vencimientos
- [ ] Integración con anexos (ATS)
- [ ] Detalle de transacciones incluidas en cada cierre

