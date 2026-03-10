# Plan: Declaracion Anual del Impuesto a la Renta

## Contexto

El sistema ya tiene un modulo completo de **Liquidacion de IVA** (mensual/semestral). Ahora se necesita agregar la **Declaracion Anual del Impuesto a la Renta** para personas naturales en Ecuador (Formulario 102/102A del SRI).

El IR es un impuesto progresivo anual que grava la renta neta. Se calcula a partir de los ingresos brutos, menos costos de actividad profesional, menos gastos personales deducibles (con limites por categoria), aplicando una tabla progresiva (0% a 37%), y restando las retenciones en la fuente de renta recibidas durante el anio.

La base de datos ya tiene los datos necesarios: `ventas` (ingresos), `compras` con campo `rubro` (clasifica gastos personales), y `retenciones` con `retencion_renta_valor`. Solo faltan tablas de parametros y la tabla de declaraciones.

---

## Paso 1: Migraciones de Base de Datos (Supabase MCP)

### 1.1 Tabla `tramos_impuesto_renta`
Tramos de la tabla progresiva del IR por anio fiscal.

```sql
CREATE TABLE tramos_impuesto_renta (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  anio_fiscal SMALLINT NOT NULL,
  fraccion_basica NUMERIC(14,2) NOT NULL,
  exceso_hasta NUMERIC(14,2) NOT NULL,
  impuesto_fraccion_basica NUMERIC(14,2) NOT NULL DEFAULT 0,
  porcentaje_excedente NUMERIC(5,2) NOT NULL,
  orden SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (anio_fiscal, orden)
);

ALTER TABLE tramos_impuesto_renta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read tramos"
  ON tramos_impuesto_renta FOR SELECT
  TO authenticated USING (true);

CREATE INDEX idx_tramos_ir_anio ON tramos_impuesto_renta(anio_fiscal);
```

### 1.2 Tabla `parametros_anuales`
Canasta basica y limites de gastos personales deducibles por anio.

```sql
CREATE TABLE parametros_anuales (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  anio_fiscal SMALLINT NOT NULL UNIQUE,
  canasta_basica NUMERIC(14,2) NOT NULL,
  limite_vivienda NUMERIC(5,3) NOT NULL DEFAULT 0.325,
  limite_alimentacion NUMERIC(5,3) NOT NULL DEFAULT 0.325,
  limite_educacion NUMERIC(5,3) NOT NULL DEFAULT 0.325,
  limite_vestimenta NUMERIC(5,3) NOT NULL DEFAULT 0.325,
  limite_salud NUMERIC(5,3) NOT NULL DEFAULT 1.300,
  limite_turismo NUMERIC(5,3) NOT NULL DEFAULT 0.325,
  limite_total_porcentaje_base NUMERIC(6,3) NOT NULL DEFAULT 18.000,
  incremento_por_carga NUMERIC(6,3) NOT NULL DEFAULT 0.932,
  max_cargas_deduccion SMALLINT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parametros_anuales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read parametros"
  ON parametros_anuales FOR SELECT
  TO authenticated USING (true);
```

### 1.3 Tabla `declaraciones_renta`
Almacena las declaraciones anuales generadas.

```sql
CREATE TABLE declaraciones_renta (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  contribuyente_ruc CHAR(13) NOT NULL REFERENCES contribuyentes(ruc) ON DELETE CASCADE,
  anio_fiscal SMALLINT NOT NULL,
  ingresos_brutos NUMERIC(14,2) NOT NULL DEFAULT 0,
  costos_gastos_deducibles NUMERIC(14,2) NOT NULL DEFAULT 0,
  utilidad_ejercicio NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_vivienda NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_alimentacion NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_educacion NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_vestimenta NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_salud NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_turismo NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_vivienda_deducible NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_alimentacion_deducible NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_educacion_deducible NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_vestimenta_deducible NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_salud_deducible NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_turismo_deducible NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_gastos_personales_deducibles NUMERIC(14,2) NOT NULL DEFAULT 0,
  base_imponible NUMERIC(14,2) NOT NULL DEFAULT 0,
  impuesto_causado NUMERIC(14,2) NOT NULL DEFAULT 0,
  retenciones_renta NUMERIC(14,2) NOT NULL DEFAULT 0,
  impuesto_a_pagar NUMERIC(14,2) NOT NULL DEFAULT 0,
  cargas_familiares_usadas SMALLINT NOT NULL DEFAULT 0,
  canasta_basica_usada NUMERIC(14,2) NOT NULL DEFAULT 0,
  modo_manual BOOLEAN NOT NULL DEFAULT FALSE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (contribuyente_ruc, anio_fiscal)
);

ALTER TABLE declaraciones_renta ENABLE ROW LEVEL SECURITY;
-- Misma politica que tax_liquidations: el usuario solo ve sus propios datos
CREATE POLICY "Users can manage own declaraciones"
  ON declaraciones_renta FOR ALL
  TO authenticated
  USING (contribuyente_ruc IN (
    SELECT ruc FROM contribuyentes WHERE user_id = auth.uid()
    UNION
    SELECT contribuyente_ruc FROM contador_contribuyente cc
    JOIN contadores c ON cc.contador_id = c.id
    WHERE c.user_id = auth.uid() AND cc.estado = 'activo'
  ));

CREATE INDEX idx_declaraciones_renta_ruc ON declaraciones_renta(contribuyente_ruc);
```

### 1.4 Seed: Tramos 2025

```sql
INSERT INTO tramos_impuesto_renta (anio_fiscal, fraccion_basica, exceso_hasta, impuesto_fraccion_basica, porcentaje_excedente, orden) VALUES
(2025,      0.00,  12081.00,      0.00,  0, 1),
(2025,  12081.00,  15388.00,      0.00,  5, 2),
(2025,  15388.00,  19891.00,    165.35, 10, 3),
(2025,  19891.00,  26270.00,    615.65, 12, 4),
(2025,  26270.00,  34646.00,   1381.13, 15, 5),
(2025,  34646.00,  46181.00,   2637.53, 20, 6),
(2025,  46181.00,  61372.00,   4944.53, 25, 7),
(2025,  61372.00,  81784.00,   8742.28, 30, 8),
(2025,  81784.00, 108974.00,  14865.88, 35, 9),
(2025, 108974.00, 999999999.99, 24382.38, 37, 10);
```

### 1.5 Seed: Parametros 2025

```sql
INSERT INTO parametros_anuales (anio_fiscal, canasta_basica) VALUES (2025, 789.57);
```

---

## Paso 2: Tipos TypeScript

**Archivo:** `src/lib/supabase.ts` (agregar al final)

```typescript
export interface TramoImpuestoRenta {
  id: string;
  anio_fiscal: number;
  fraccion_basica: number;
  exceso_hasta: number;
  impuesto_fraccion_basica: number;
  porcentaje_excedente: number;
  orden: number;
}

export interface ParametrosAnuales {
  id: string;
  anio_fiscal: number;
  canasta_basica: number;
  limite_vivienda: number;
  limite_alimentacion: number;
  limite_educacion: number;
  limite_vestimenta: number;
  limite_salud: number;
  limite_turismo: number;
  limite_total_porcentaje_base: number;
  incremento_por_carga: number;
  max_cargas_deduccion: number;
}

export interface DeclaracionRenta {
  id: string;
  contribuyente_ruc: string;
  anio_fiscal: number;
  ingresos_brutos: number;
  costos_gastos_deducibles: number;
  utilidad_ejercicio: number;
  gasto_vivienda: number;
  gasto_alimentacion: number;
  gasto_educacion: number;
  gasto_vestimenta: number;
  gasto_salud: number;
  gasto_turismo: number;
  gasto_vivienda_deducible: number;
  gasto_alimentacion_deducible: number;
  gasto_educacion_deducible: number;
  gasto_vestimenta_deducible: number;
  gasto_salud_deducible: number;
  gasto_turismo_deducible: number;
  total_gastos_personales_deducibles: number;
  base_imponible: number;
  impuesto_causado: number;
  retenciones_renta: number;
  impuesto_a_pagar: number;
  cargas_familiares_usadas: number;
  canasta_basica_usada: number;
  modo_manual: boolean;
  notas: string | null;
  created_at: string;
  deleted_at: string | null;
}
```

---

## Paso 3: Logica de Calculo

**Archivo nuevo:** `src/lib/declaracion-renta.ts` (~300 lineas)

Replica la estructura de `src/lib/liquidacion.ts`. Reutiliza `formatCurrency` importandolo de alli.

### Interfaces principales:
- `GastosPersonalesDeducibles` - cada categoria con { real, limite, deducible }
- `DeclaracionRentaCalculo` - resultado numerico completo
- `DeclaracionRentaSummaryData` - summary completo para UI (analogo a `LiquidacionSummaryData`)
- `DeclaracionRentaCalcInput` - input para la funcion principal

### Funciones:

1. **`calcularLimitesGastosPersonales(gastos, parametros, cargasFamiliares)`**
   - Aplica limite por categoria: `min(gastoReal, limiteCategoria * canasta * 7)`
   - Aplica tope total: `(porcentajeBase + cargas * incremento) / 100 * canasta * 7`
   - Si la suma excede el tope total, reduce proporcionalmente

2. **`calcularImpuestoRenta(baseImponible, tramos)`**
   - Busca el tramo correcto donde `fraccion_basica <= base < exceso_hasta`
   - Retorna: `impuesto_fraccion_basica + (base - fraccion_basica) * porcentaje / 100`

3. **`calculateDeclaracionRenta(input): DeclaracionRentaSummaryData`** (funcion principal)
   - Calcula utilidad = ingresos - costos
   - Calcula gastos personales deducibles con limites
   - Base imponible = max(0, utilidad - gastos personales deducibles)
   - Impuesto causado = tabla progresiva
   - Impuesto a pagar = impuesto causado - retenciones (puede ser negativo = saldo a favor)

4. **`buildDeclaracionRentaInsertPayload(ruc, summary)`** - mapea a row de DB
5. **`mapDeclaracionRentaToSummary(row, parametros, tramos)`** - mapea de DB a summary

### Plazos por 9no digito del RUC:
Funcion `getFechaLimiteRenta(ruc, anioFiscal)` que retorna la fecha limite de declaracion segun el 9no digito del RUC (10-28 de marzo del anio siguiente).

```typescript
const PLAZOS_NOVENO_DIGITO: Record<string, number> = {
  "1": 10, "2": 12, "3": 14, "4": 16, "5": 18,
  "6": 20, "7": 22, "8": 24, "9": 26, "0": 28,
};
```

---

## Paso 4: Componentes UI

**Carpeta nueva:** `src/components/declaracion-renta/`

Replica la estructura de `src/components/liquidacion/`.

### 4.1 `declaracion-renta-kpis.tsx` (~70 lineas)
Replica `liquidacion-kpis.tsx`. 4 tarjetas:
- Ingresos brutos
- Gastos deducibles
- Base imponible
- Impuesto a pagar (o "Saldo a favor" si negativo)

### 4.2 `declaracion-renta-summary.tsx` (~280 lineas)
Replica `liquidacion-summary.tsx`. Muestra el desglose completo:
- **Seccion 1**: Ingresos y costos (ingresos brutos, costos actividad, utilidad)
- **Seccion 2**: Gastos personales por categoria (tabla con columnas: Categoria | Monto real | Limite | Deducible)
- **Seccion 3**: Calculo del impuesto (base imponible, tramo aplicado, impuesto causado, retenciones, resultado final)
- Badge de estado: "Por pagar" (rojo) / "Saldo a favor" (verde) / "Sin impuesto" (gris)

### 4.3 `declaraciones-renta-table.tsx` (~140 lineas)
Replica `liquidaciones-table.tsx`. Columnas:
- Anio fiscal
- Ingresos brutos
- Base imponible
- Impuesto causado
- Retenciones
- Total a pagar
- Estado (badge)
- Registrado (fecha)
- Acciones (ver detalle)

### 4.4 `detalle-declaracion-dialog.tsx` (~40 lineas)
Wrapper de Dialog que muestra `DeclaracionRentaSummary`.

### 4.5 `generar-declaracion-dialog.tsx` (~450 lineas)
Replica `generar-liquidacion-dialog.tsx`. Flujo:

1. **Selector de anio fiscal** (solo anio, no mes/semestre)
2. **Toggle Automatico/Manual**
3. **Modo automatico** - consulta Supabase:
   - `ventas` del anio → sum subtotales = ingresos brutos
   - `compras` where `rubro = 'actividad_profesional'` → sum subtotales = costos
   - `compras` agrupadas por rubro personal → gastos por categoria
   - `retenciones` del anio → sum `retencion_renta_valor`
   - `parametros_anuales` del anio fiscal
   - `tramos_impuesto_renta` del anio fiscal
   - `contribuyente.cargas_familiares` del contexto de auth
4. **Validaciones**:
   - El anio fiscal debe haber terminado
   - No debe existir declaracion previa para ese anio/ruc
   - Mostrar advertencia si hay compras sin rubro asignado
   - Mostrar advertencia si no existen parametros para el anio
5. **Preview** con `DeclaracionRentaSummary`
6. **Guardar** → insert en `declaraciones_renta`

---

## Paso 5: Pagina

**Archivo nuevo:** `src/app/(app)/modules/declaracion-renta/page.tsx` (~250 lineas)

Replica la estructura exacta de `src/app/(app)/modules/liquidacion/page.tsx`:
- Suspense wrapper
- `useAuth()` → `contribuyenteEfectivo`
- Carga declaraciones del contribuyente filtradas por anio
- KPIs de la declaracion seleccionada
- Tabla de historial con paginacion
- Dialogo de generacion + dialogo de detalle
- Titulo: "Declaracion de Impuesto a la Renta"
- Boton: "Nueva declaracion"
- Filtro: solo `TaxPeriodFilter` simplificado (solo anio, sin mes) — pasar prop `showMonth={false}` o crear un `YearFilter` simple con un `<Select>`

---

## Paso 6: Navegacion

**Archivo:** `src/components/app-sidebar.tsx`

Agregar item despues de "Liquidacion" en el array `mainItems`:

```typescript
import { ..., Landmark } from "lucide-react";

{
  title: "Impuesto a la Renta",
  url: "/modules/declaracion-renta",
  icon: Landmark,
},
```

---

## Archivos criticos a modificar/crear

| Archivo | Accion |
|---------|--------|
| `src/lib/supabase.ts` | Agregar 3 interfaces |
| `src/lib/declaracion-renta.ts` | **NUEVO** - logica de calculo |
| `src/components/declaracion-renta/declaracion-renta-kpis.tsx` | **NUEVO** |
| `src/components/declaracion-renta/declaracion-renta-summary.tsx` | **NUEVO** |
| `src/components/declaracion-renta/declaraciones-renta-table.tsx` | **NUEVO** |
| `src/components/declaracion-renta/detalle-declaracion-dialog.tsx` | **NUEVO** |
| `src/components/declaracion-renta/generar-declaracion-dialog.tsx` | **NUEVO** |
| `src/app/(app)/modules/declaracion-renta/page.tsx` | **NUEVO** |
| `src/components/app-sidebar.tsx` | Agregar 1 item al menu |

### Archivos de referencia (NO modificar, solo replicar patrones):
- `src/lib/liquidacion.ts` — estructura de calculo, `formatCurrency`, `toPositiveNumber`
- `src/components/liquidacion/generar-liquidacion-dialog.tsx` — patron del dialog auto/manual
- `src/components/liquidacion/liquidacion-summary.tsx` — patron del summary
- `src/components/liquidacion/liquidaciones-table.tsx` — patron de la tabla
- `src/components/liquidacion/liquidacion-kpis.tsx` — patron de KPIs
- `src/app/(app)/modules/liquidacion/page.tsx` — patron de pagina

---

## Orden de implementacion

1. Migraciones DB (via `mcp__supabase__apply_migration`) + seeds
2. Tipos en `supabase.ts`
3. `declaracion-renta.ts` (calculo puro)
4. Componentes: kpis → summary → table → detalle-dialog → generar-dialog
5. Pagina
6. Sidebar

---

## Verificacion

1. **DB**: Ejecutar `SELECT * FROM tramos_impuesto_renta WHERE anio_fiscal = 2025` para confirmar seed
2. **Calculo**: Probar con ejemplo: ingresos = $30,000, costos = $5,000, sin gastos personales → base = $25,000 → tramo 4 → impuesto = 615.65 + (25000-19891)*0.12 = $1,228.73
3. **UI**: Navegar a `/modules/declaracion-renta`, crear nueva declaracion para anio 2025, verificar que los datos se cargan de ventas/compras/retenciones
4. **Edge cases**: Probar con 0 ingresos, con base imponible bajo fraccion exenta, con retenciones mayores al impuesto (saldo a favor)
