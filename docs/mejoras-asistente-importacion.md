# Plan de Mejoras: Asistente de Importacion Tributaria

## Resumen Ejecutivo

El Asistente de Importacion es un wizard de 6 pasos para carga masiva de datos del SRI (ventas, compras, retenciones). Tras un analisis exhaustivo del codigo, se identificaron **15 puntos criticos** agrupados en 3 niveles de severidad. Este documento detalla cada hallazgo, la solucion propuesta, los archivos afectados y el plan de implementacion por fases.

### Arquitectura Actual

```
Paso 0: Seleccion de periodo (mes/anio)
    |
Paso 1: Upload ventas.txt --> parsearArchivoVentas() --> VentaParsed[]
    |
Paso 2: Upload compras.txt --> parsearArchivoCompras() --> CompraParsed[] + ProveedorResumen[]
    |                          (usuario asigna rubros por proveedor)
    |
Paso 3: Upload retenciones/*.xml --> parsearXMLRetencion() --> RetencionParsed[]
    |
Paso 4: Procesamiento automatico:
    |   - supabase.from("ventas").upsert(...)       [batch]
    |   - supabase.from("compras").upsert(...)      [batch]
    |   - for each retencion:                        [individual]
    |       supabase.from("retenciones").upsert(...)
    |       supabase.from("ventas").select(...)      [vinculacion]
    |   - fetch("/api/ai-agent/import-summary")      [resumen IA]
    |
Paso 5: Resumen ejecutivo con KPIs, alertas, recomendaciones
```

---

## Hallazgos Detallados

---

### 1. CRITICO: Sin rollback en el procesamiento

**Archivo:** `src/components/assistant/wizard-steps/step-processing.tsx` (lineas 46-103)

**Problema:**
El paso de procesamiento ejecuta 3 operaciones de BD secuenciales (ventas, compras, retenciones). Si la segunda o tercera falla, las anteriores ya estan committeadas. No hay transaccion atomica.

```typescript
// Flujo actual (simplificado)
await guardarVentas();     // OK - datos en BD
await guardarCompras();    // FALLA - ventas ya insertadas, compras no
// Usuario ve error generico, datos inconsistentes
```

**Consecuencias:**
- Datos parciales en la BD sin forma de revertir
- Si el usuario reintenta, `ignoreDuplicates: true` descarta las ventas duplicadas pero no actualiza si los datos cambiaron
- El resumen se calcula sobre datos incompletos

**Solucion propuesta:**
Crear una API route server-side (`/api/import/process`) que reciba los 3 conjuntos de datos y ejecute todo dentro de una transaccion de Postgres:

```typescript
// Pseudocodigo de la API route
export async function POST(req: Request) {
  const { ventas, compras, retenciones, periodo, contribuyenteRuc } = await req.json();

  // Usar supabaseAdmin.rpc() con una funcion PL/pgSQL transaccional
  const { error } = await supabaseAdmin.rpc("import_periodo_completo", {
    p_ruc: contribuyenteRuc,
    p_ventas: JSON.stringify(ventas),
    p_compras: JSON.stringify(compras),
    p_retenciones: JSON.stringify(retenciones),
    p_periodo_mes: periodo.mes,
    p_periodo_anio: periodo.anio,
  });

  // Si falla, Postgres revierte todo automaticamente
}
```

**Archivos a modificar:**
- Crear: `src/app/api/import/process/route.ts`
- Crear: migracion SQL con funcion `import_periodo_completo`
- Modificar: `step-processing.tsx` (reemplazar 3 llamadas por 1 fetch)

**Criterios de aceptacion:**
- [ ] Si falla la insercion de compras, las ventas no quedan en la BD
- [ ] Si falla la insercion de retenciones, ni ventas ni compras quedan
- [ ] El error se comunica al usuario con detalle de que paso fallo

---

### 2. CRITICO: Retenciones se guardan una por una (N+1 queries)

**Archivo:** `step-processing.tsx` (lineas 172-226)

**Problema:**
Mientras ventas y compras se insertan en batch (1 upsert), las retenciones se procesan en un loop con 2 queries por retencion:

```typescript
for (const retencion of retenciones.parsed) {
  await supabase.from("retenciones").upsert({...});          // Query 1
  await supabase.from("ventas").select("id")...single();     // Query 2
}
// 50 retenciones = 100 queries
```

**Consecuencias:**
- Tiempos de procesamiento que escalan linealmente con la cantidad de retenciones
- Riesgo de timeout en el browser
- Carga excesiva sobre Supabase

**Solucion propuesta:**
```typescript
// 1. Batch upsert de todas las retenciones
const retencionesToInsert = retenciones.parsed.map(r => ({...}));
await supabase.from("retenciones").upsert(retencionesToInsert, {
  onConflict: "contribuyente_ruc,numero_comprobante",
  ignoreDuplicates: true,
});

// 2. Vinculacion masiva con una sola query
const rucEmisores = [...new Set(retenciones.parsed.map(r => r.ruc_emisor).filter(Boolean))];
const { data: ventasVinculadas } = await supabase
  .from("ventas")
  .select("id, cliente_ruc, numero_comprobante")
  .eq("contribuyente_ruc", contribuyenteRuc)
  .eq("periodo_mes", periodo.mes)
  .eq("periodo_anio", periodo.anio)
  .in("cliente_ruc", rucEmisores);

const vinculadas = ventasVinculadas?.length ?? 0;
```

**Archivos a modificar:**
- `step-processing.tsx` (funcion `guardarRetenciones`)

**Criterios de aceptacion:**
- [ ] Maximo 2 queries para todas las retenciones (1 upsert + 1 select)
- [ ] Tiempo de procesamiento no escala linealmente con cantidad de retenciones
- [ ] Resultado de vinculacion identico al metodo anterior

---

### 3. ALTO: IVA calculado con tasa unica para todas las ventas

**Archivo:** `src/lib/ventas-parser.ts` (lineas 112-210)

**Problema:**
El usuario selecciona UNA tasa de IVA que se aplica a todas las ventas. En la realidad, un contribuyente puede tener ventas con tarifa 0% (exentas) y 15% en el mismo periodo. El archivo TXT del SRI solo incluye `VALOR_TOTAL` sin desglose de IVA.

**Consecuencias:**
- Calculo de IVA en ventas incorrecto para contribuyentes con ventas mixtas
- Cascada: IVA a pagar calculado incorrectamente en el resumen

**Solucion propuesta:**
1. Deteccion automatica: si `total == subtotal` (IVA calculado = 0), marcar esa venta como tarifa 0% automaticamente, sin intervencion del usuario
2. Disclaimer visible solo para casos ambiguos donde no se puede inferir la tarifa
3. A futuro: permitir editar la tasa por venta individual en una tabla de preview

```typescript
// Heuristica de deteccion automatica
const divisor = 1 + tasaIVA / 100;
const subtotalCalculado = parseFloat((total / divisor).toFixed(2));
const ivaCalculado = total - subtotalCalculado;

// Si el IVA calculado es ~0, esta venta es probablemente tarifa 0%
if (ivaCalculado < 0.01) {
  return { subtotal: total, iva: 0, total, tasaIVA: 0 };
}
```

**Archivos a modificar:**
- `src/lib/ventas-parser.ts` (deteccion automatica de tarifa 0%)
- `src/components/assistant/wizard-steps/step-ventas.tsx` (disclaimer para casos ambiguos)

**Criterios de aceptacion:**
- [ ] Ventas con total = subtotal se detectan automaticamente como tarifa 0%
- [ ] El usuario ve un aviso claro sobre la limitacion de tasa unica para ventas mixtas
- [ ] El aviso aparece antes de cargar el archivo

---

### 4. ALTO: Vinculacion de retenciones demasiado debil

**Archivo:** `step-processing.tsx` (lineas 207-221)

**Problema:**
La vinculacion retencion-venta usa solo `cliente_ruc` + periodo. Si un cliente tiene multiples facturas, todas las retenciones matchean con la primera. El XML ya contiene `num_doc_sustento` (numero de factura sustento) que podria usarse para vincular exactamente.

```typescript
// Actual: vincula por RUC (impreciso)
.eq("cliente_ruc", retencion.ruc_emisor || "")

// Deberia: vincular por numero de documento
.eq("numero_comprobante", retencion.num_doc_sustento)
```

**Nota sobre la logica de RUC:** El codigo actual asume que `ruc_emisor` de la retencion corresponde a `cliente_ruc` de la venta. Esto solo es correcto cuando el contribuyente emitio la factura y el cliente emitio la retencion. Verificar que esta suposicion aplica para todos los casos de uso antes de implementar.

**Archivos a modificar:**
- `step-processing.tsx` (logica de vinculacion)
- Se aprovecha `RetencionParsed.num_doc_sustento` que ya esta parseado

**Criterios de aceptacion:**
- [ ] Vinculacion usa `num_doc_sustento` cuando esta disponible
- [ ] Fallback a vinculacion por RUC si `num_doc_sustento` no existe
- [ ] Conteo de vinculaciones mas preciso
- [ ] La suposicion ruc_emisor == cliente_ruc esta validada para los flujos del SRI

---

### 5. ALTO: Formula de IVA inconsistente entre frontend y API

**Archivos:**
- `step-processing.tsx` (linea 248): `ivaAPagar = ivaVentas - ivaCompras - totalRetencionesIVA`
- `import-summary/route.ts` (linea 86): `ivaAPagar = ivaVentas - ivaCompras`

**Problema:**
La API de resumen no resta las retenciones de IVA al calcular el IVA a pagar. Las alertas generadas por la IA se basan en un monto inflado.

**Solucion propuesta:**
Enviar `retencionIVA` y `retencionRenta` como campos separados al endpoint (actualmente se envia solo `retencionesTotal`):

```typescript
// En step-processing.tsx -> generarResumen()
body: JSON.stringify({
  ...
  retencionIVA: totalRetencionesIVA,      // NUEVO
  retencionRenta: totalRetencionesRenta,   // NUEVO
})

// En import-summary/route.ts
const ivaAPagar = Math.max(0, ivaVentas - ivaCompras - retencionIVA);
```

**Archivos a modificar:**
- `step-processing.tsx` (payload del fetch)
- `src/app/api/ai-agent/import-summary/route.ts` (interface + calculo)

**Criterios de aceptacion:**
- [ ] Formula de IVA identica en frontend y API
- [ ] Alertas de IA usan el monto correcto

---

### 6. ALTO: Fecha invalida reemplazada silenciosamente por HOY

**Archivos:** `ventas-parser.ts:78-81`, `compras-parser.ts:209-212`, `retencion-xml-parser.ts:83-86`

**Problema:**
```typescript
catch {
  return dayjs().format("YYYY-MM-DD"); // HOY como fallback
}
```
Si una fecha no se puede parsear, se usa la fecha de hoy sin avisar. Una factura de octubre importada en febrero aparecera con fecha de febrero.

**Solucion propuesta:**
Cambiar los parsers para retornar informacion de advertencias:

```typescript
// Opcion 1: Retornar resultado con warnings
interface ParseResult<T> {
  data: T[];
  warnings: string[];  // "Linea 15: fecha invalida '32/13/2025', se uso fecha del periodo"
}

// Opcion 2 (minima): Usar fecha del periodo como fallback en vez de hoy
const fallbackDate = dayjs(`${periodo.anio}-${periodo.mes}-01`).format("YYYY-MM-DD");
```

**Archivos a modificar:**
- `src/lib/ventas-parser.ts`
- `src/lib/compras-parser.ts`
- `src/lib/retencion-xml-parser.ts`
- Steps de UI (para mostrar warnings)

**Criterios de aceptacion:**
- [ ] Nunca se usa la fecha de hoy como fallback
- [ ] Se usa el primer dia del periodo seleccionado como fallback
- [ ] El usuario ve cuantas fechas tuvieron problemas

---

### 7. MEDIO: Escrituras directas desde el cliente

**Archivo:** `step-processing.tsx` (usa `supabase` client-side)

**Problema:**
Las inserciones a las 3 tablas se hacen directamente desde el browser. La seguridad depende unicamente de RLS. No hay validacion server-side.

**Solucion propuesta:**
Mover a API route (se resuelve automaticamente al implementar la mejora #1).

---

### 8. MEDIO: No se puede omitir el paso de retenciones

**Archivo:** `step-retenciones.tsx` (linea 369-371)

**Problema:**
El boton "Procesar Todo" requiere tener archivos. Contribuyentes sin retenciones quedan bloqueados.

**Solucion propuesta:**
Subsumido por la mejora #13 (pasos omitibles).

---

### 9. MEDIO: Sin limite de tamanio de archivo

**Archivos:** `step-ventas.tsx`, `step-compras.tsx`, `step-retenciones.tsx`

**Problema:**
No hay validacion de `file.size`. Archivos grandes pueden crashear el browser. Los parsers llaman `.text()` sobre el archivo completo sin verificacion previa.

**Solucion propuesta:**
```typescript
const MAX_TXT_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_XML_SIZE = 1 * 1024 * 1024;   // 1MB

const processFile = async (file: File) => {
  if (file.size > MAX_TXT_SIZE) {
    setError(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximo permitido: 10MB.`);
    return;
  }
  // ...
};
```

**Archivos a modificar:**
- `step-ventas.tsx`, `step-compras.tsx`, `step-retenciones.tsx`

**Criterios de aceptacion:**
- [ ] Archivos TXT mayores a 10MB son rechazados con mensaje claro
- [ ] Archivos XML mayores a 1MB son rechazados con mensaje claro

---

### 10. MEDIO: Gap en deteccion de tarifa IVA 12%

**Archivo:** `src/lib/compras-parser.ts` (lineas 162-191)

**Problema:**
La deteccion automatica de tarifa IVA no cubre el rango 12% (0.11-0.13). Compras con IVA 12% (periodos anteriores a abril 2024) se clasifican como 15%.

**Solucion propuesta:**
```typescript
if (tarifaIva <= 0.001) { subtotal_0 }
else if (tarifaIva >= 0.07 && tarifaIva <= 0.09) { subtotal_8 }
else if (tarifaIva >= 0.11 && tarifaIva <= 0.13) { subtotal_12 }  // NUEVO
else if (tarifaIva >= 0.14 && tarifaIva <= 0.16) { subtotal_15 }
```

Nota: Requiere agregar campo `subtotal_12` a `CompraParsed` y a la tabla de BD.

**Archivos a modificar:**
- `src/lib/compras-parser.ts`
- Posible migracion SQL para agregar columna

**Criterios de aceptacion:**
- [ ] Compras con IVA ~12% se clasifican correctamente
- [ ] No se rompen datos existentes con 0%, 8% o 15%

---

### 11. BAJO: Funcion `parsearMultiplesXML` sin uso

**Archivo:** `src/lib/retencion-xml-parser.ts` (lineas 223-241)

Eliminar funcion muerta o refactorizar `import-wizard.tsx` para usarla.

---

### 12. BAJO: Tabla de proveedores sin memoizacion

**Archivo:** `step-compras.tsx` (lineas 262-315)

Cada cambio de rubro re-renderiza toda la tabla. Memoizar filas con `React.memo`. Subsumido por #14.

---

### 13. ALTO: Pasos no se pueden omitir — flujo rigido

**Archivos:** `step-ventas.tsx`, `step-compras.tsx`, `step-retenciones.tsx`, `import-wizard.tsx`

**Problema:**
El wizard obliga un flujo lineal estricto: periodo -> ventas -> compras -> retenciones. Cada paso requiere datos cargados para habilitar el boton "Continuar". Pero hay casos reales donde un contribuyente:
- No tiene ventas en el periodo (solo compras)
- No tiene compras (solo ventas y retenciones)
- Solo quiere cargar retenciones para vincular con ventas ya existentes
- No tiene notas de credito ni retenciones

Actualmente, si no cargas ventas, no puedes acceder a compras ni retenciones.

**Condiciones bloqueantes actuales:**
```tsx
// step-ventas.tsx:277 — bloquea si no hay ventas
<Button onClick={onNext} disabled={!hasVentas}>

// step-compras.tsx:329 — bloquea si no hay compras
<Button onClick={onNext} disabled={!hasCompras}>

// step-retenciones.tsx:370 — bloquea si no hay retenciones ni archivos pendientes
<Button onClick={onNext} disabled={!hasRetenciones && !hasPendingFiles}>
```

**Solucion propuesta:**
Agregar un boton "Omitir paso" en cada step (ventas, compras, retenciones). El step-processing debe manejar gracilmente los arrays vacios (ya lo hace parcialmente con `if (ventas.parsed.length === 0) return;`).

```tsx
// Patron para todos los steps:
<div className="flex justify-between">
  <Button variant="outline" onClick={onBack}>
    <ArrowLeft className="mr-2 h-4 w-4" />
    Atras
  </Button>
  <div className="flex gap-2">
    {!hasData && (
      <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
        <SkipForward className="mr-2 h-4 w-4" />
        Omitir
      </Button>
    )}
    <Button onClick={onNext} disabled={false}>
      {hasData ? "Continuar" : "Siguiente"}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
</div>
```

**Cambios necesarios en step-processing:**
- Verificar que funciona con 0 ventas + N compras + 0 retenciones
- El resumen debe adaptarse (no mostrar KPI de ventas si ventasCount === 0)
- El AI summary debe recibir flag de "datos omitidos" para no generar alertas irrelevantes

**Archivos a modificar:**
- `src/components/assistant/wizard-steps/step-ventas.tsx` (agregar "Omitir")
- `src/components/assistant/wizard-steps/step-compras.tsx` (agregar "Omitir")
- `src/components/assistant/wizard-steps/step-retenciones.tsx` (agregar "Omitir")
- `src/components/assistant/wizard-steps/step-processing.tsx` (manejar arrays vacios)
- `src/components/assistant/wizard-steps/step-summary.tsx` (ocultar KPIs vacios)

**Criterios de aceptacion:**
- [ ] El usuario puede saltar ventas e ir directo a compras
- [ ] El usuario puede saltar compras e ir a retenciones
- [ ] El usuario puede saltar retenciones e procesar
- [ ] El paso de processing no falla con 0 ventas, 0 compras, o 0 retenciones
- [ ] El resumen omite KPIs de secciones sin datos
- [ ] El usuario ve claramente que un paso fue omitido (en el wizard navigation)
- [ ] Al menos 1 tipo de dato debe cargarse (no permitir saltar los 3)

---

### 14. ALTO: Step de compras del wizard difiere del modulo /modules/compras — duplicacion de logica

**Archivos comparados:**
- Wizard: `src/components/assistant/wizard-steps/step-compras.tsx` (337 lineas)
- Modulo: `src/components/compras/importar-compras-dialog.tsx` (889 lineas)

**Problema:**
El step de compras del wizard es una version simplificada del dialogo de importacion del modulo de compras. Ambos parsean el mismo archivo TXT, agrupan proveedores, y asignan rubros. Pero el `ImportarComprasDialog` tiene funcionalidades que el wizard no tiene:

| Funcionalidad | Wizard step-compras | ImportarComprasDialog |
|---|---|---|
| Parseo de archivo TXT | Si | Si |
| Agrupacion por proveedor | Si | Si |
| Asignacion individual de rubro | Si (Select basico) | Si (Select con iconos) |
| **Seleccion masiva (checkboxes)** | No | Si |
| **Asignacion masiva de rubro** | No | Si |
| **Busqueda/filtro de proveedores** | No | Si |
| **"Seleccionar sin rubro"** | No | Si |
| **Sugerencia historica de rubros** | No | Si (busca rubros anteriores en BD) |
| **Barra de seleccion sticky** | No | Si |
| **Footer con totales** | No | Si |
| **Tooltips en nombres largos** | No | Si |
| **Batch insert con progress** | No (upsert en processing step) | Si (50 records/batch) |
| Columnas: Valor S/I, IVA | No | Si |
| Badge de cantidad compras | No | Si |
| Iconos por rubro en selector | No | Si |

**Consecuencias:**
- Experiencia de usuario inconsistente entre el wizard y el modulo standalone
- Duplicacion de logica de asignacion de rubros
- El wizard carece de funcionalidades clave (seleccion masiva, busqueda) que hacen la asignacion mucho mas eficiente con 50+ proveedores

**Solucion propuesta:**
Extraer un componente reutilizable `ProveedorRubroEditor` que ambos (wizard y dialog) puedan usar. Este componente encapsula toda la logica de la tabla de proveedores con rubros.

```tsx
// Nuevo componente: src/components/compras/proveedor-rubro-editor.tsx

interface ProveedorRubroEditorProps {
  proveedores: ProveedorResumen[];
  onProveedoresChange: (proveedores: ProveedorResumen[]) => void;

  // Funcionalidades opcionales
  enableBulkSelection?: boolean;   // checkboxes + asignacion masiva (default: true)
  enableSearch?: boolean;          // barra de busqueda (default: true)
  enableHistoricalSuggestions?: boolean; // auto-sugerir rubros (default: false)
  showTotalsFooter?: boolean;      // footer con sumas (default: true)
  maxHeight?: string;              // altura max del scroll (default: "400px")

  // Para sugerencias historicas
  contribuyenteRuc?: string;
  excludeIds?: string[];           // IDs a excluir de la busqueda historica
}
```

**Estructura del componente:**

```
<ProveedorRubroEditor>
  ├── BulkActionBar (si enableBulkSelection && hay seleccion)
  │   ├── Contador de seleccionados
  │   ├── Select de rubro masivo
  │   ├── Boton "Aplicar"
  │   └── Boton "Limpiar seleccion"
  ├── FilterBar (si enableSearch)
  │   ├── Input de busqueda
  │   ├── Boton "Seleccionar sin rubro"
  │   └── Contador "X de Y proveedores"
  └── Table
      ├── Header (con checkbox "select all" si enableBulkSelection)
      ├── Body (filas con checkbox, proveedor, #compras, valor, IVA, total, rubro)
      └── Footer (totales si showTotalsFooter)
```

**Uso en el wizard:**
```tsx
// step-compras.tsx (simplificado)
<ProveedorRubroEditor
  proveedores={compras.proveedores}
  onProveedoresChange={(updated) => {
    // Actualizar proveedores y propagar rubros a compras parsed
    updated.forEach(p => onRubroChange(p.ruc_proveedor, p.rubro));
  }}
  enableHistoricalSuggestions={false}  // wizard no tiene datos previos
  maxHeight="300px"
/>
```

**Uso en el dialog:**
```tsx
// importar-compras-dialog.tsx (step "assign")
<ProveedorRubroEditor
  proveedores={proveedores}
  onProveedoresChange={setProveedores}
  enableHistoricalSuggestions={true}
  contribuyenteRuc={contribuyenteRuc}
  excludeIds={comprasInsertadas}
  maxHeight="50vh"
/>
```

**Archivos a crear:**
- `src/components/compras/proveedor-rubro-editor.tsx` — componente reutilizable

**Archivos a modificar:**
- `src/components/assistant/wizard-steps/step-compras.tsx` — reemplazar tabla inline por `ProveedorRubroEditor`
- `src/components/compras/importar-compras-dialog.tsx` — reemplazar tabla inline por `ProveedorRubroEditor`

**Constantes compartidas a extraer:**
- `rubrosCompra` (lista de rubros con iconos) — actualmente definida en `importar-compras-dialog.tsx:73-82`
- `rubrosIconos` (mapa de iconos) — actualmente en `importar-compras-dialog.tsx:85-94`
- Mover a: `src/lib/compras-constants.ts` o dentro del componente reutilizable

**Criterios de aceptacion:**
- [ ] El step-compras del wizard se ve y funciona identico al paso "assign" del dialog
- [ ] Seleccion masiva funciona en ambos contextos
- [ ] Busqueda de proveedores funciona en ambos contextos
- [ ] "Seleccionar sin rubro" funciona en ambos contextos
- [ ] Footer con totales aparece en ambos contextos
- [ ] Iconos de rubro aparecen en los selects
- [ ] No hay duplicacion de la logica de tabla entre wizard y dialog
- [ ] Las sugerencias historicas solo se activan en el dialog (no en el wizard)

---

### 15. MEDIO: Sin validacion de datos por fila en los parsers

**Archivos:** `ventas-parser.ts`, `compras-parser.ts`, `retencion-xml-parser.ts`

**Problema:**
Los parsers validan que las **columnas** existan en el header del archivo, pero no validan valores vacios o nulos en las filas individuales. Un registro con `ruc_emisor` vacio, `valor_total` no numerico, o `clave_acceso` malformada se parsea e inserta sin problema.

```typescript
// compras-parser.ts:71-86 — solo valida headers
const columnasRequeridas = ["ruc_emisor", "razon_social_emisor", ...];
for (const columna of columnasRequeridas) {
  if (indices[columna] === -1) {
    throw new Error(`Columna requerida no encontrada: ${columna}`);
  }
}
// Pero las filas con ruc_emisor="" pasan sin problema
```

**Consecuencias:**
- Registros con datos incompletos se insertan en la BD
- Queries posteriores (vinculacion, reportes) fallan silenciosamente al operar sobre datos vacios
- El resumen IA genera metricas incorrectas

**Solucion propuesta:**
Agregar validacion por fila en cada parser, acumulando errores en vez de fallar en la primera:

```typescript
interface ParseResult<T> {
  data: T[];
  warnings: string[];   // "Fila 15: ruc_emisor vacio, registro omitido"
  skippedCount: number;  // Total de filas omitidas
}

// En el loop de parseo:
if (!rucEmisor || rucEmisor.length < 10) {
  warnings.push(`Fila ${i + 1}: RUC emisor invalido '${rucEmisor}', registro omitido`);
  skippedCount++;
  continue;
}
```

**Archivos a modificar:**
- `src/lib/ventas-parser.ts` (validar total > 0, RUC no vacio)
- `src/lib/compras-parser.ts` (validar RUC, valores numericos)
- `src/lib/retencion-xml-parser.ts` (validar campos requeridos del XML)
- Steps de UI (mostrar warnings al usuario)

**Criterios de aceptacion:**
- [ ] Filas con RUC vacio o invalido se omiten con warning
- [ ] Filas con valores no numericos se omiten con warning
- [ ] El usuario ve un resumen de cuantas filas se omitieron y por que
- [ ] Los registros validos se procesan normalmente

---

## Resumen de Mejoras

| # | Severidad | Problema | Mejora |
|---|-----------|----------|--------|
| 1 | Critico | Sin rollback en procesamiento | API route con transaccion atomica |
| 2 | Critico | Retenciones N+1 queries | Batch upsert + vinculacion masiva |
| 3 | Alto | IVA tasa unica para todas las ventas | Deteccion automatica tarifa 0% + disclaimer |
| 4 | Alto | Vinculacion retenciones debil | Usar `num_doc_sustento` |
| 5 | Alto | Formula IVA inconsistente | Alinear frontend y API |
| 6 | Alto | Fecha fallback a hoy silenciosa | Mostrar warnings al usuario |
| **13** | **Alto** | **Pasos no se pueden omitir** | **Boton "Omitir" en cada step** |
| **14** | **Alto** | **Compras wizard vs modulo duplicados** | **Componente reutilizable `ProveedorRubroEditor`** |
| 7 | Medio | Writes desde cliente sin validacion | Mover a API route server-side |
| 8 | Medio | No se puede omitir retenciones | Subsumido por #13 |
| 9 | Medio | Sin limite tamanio archivo | Validar file.size |
| 10 | Medio | Gap en deteccion tarifa 12% | Agregar rango 0.11-0.13 |
| **15** | **Medio** | **Sin validacion de datos por fila** | **Validar campos requeridos, omitir filas invalidas con warnings** |
| 11 | Bajo | Codigo muerto parsearMultiplesXML | Eliminar |
| 12 | Bajo | Tabla proveedores sin memoizacion | Subsumido por #14 |

---

## Plan de Implementacion por Fases

### Fase 1: Correcciones de Datos y Validacion
> Prioridad: Inmediata | Esfuerzo: Bajo | Riesgo de regresion: Bajo

Cambios puntuales y aislados en parsers y validaciones. No requieren reestructuracion.

| Mejora | Esfuerzo | Descripcion |
|--------|----------|-------------|
| #5 Formula IVA inconsistente | Bajo | Alinear calculo entre frontend y API |
| #6 Fecha fallback a hoy | Bajo | Usar fecha del periodo como fallback |
| #10 Gap tarifa 12% | Bajo | Agregar rango 0.11-0.13 en parser |
| #9 Limite tamanio archivo | Bajo | Validar file.size antes de parsear |
| #15 Validacion por fila | Bajo | Validar campos requeridos en cada fila del parser |

**Testing:** Probar con archivos TXT/XML de ejemplo que contengan: fechas invalidas, filas con campos vacios, archivos > 10MB, compras con IVA 12%.

---

### Fase 2: Flujo Flexible — Pasos Omitibles
> Prioridad: Alta | Esfuerzo: Medio | Riesgo de regresion: Medio

Afecta el flujo completo del wizard. Requiere pruebas end-to-end con distintas combinaciones de datos.

| Mejora | Esfuerzo | Descripcion |
|--------|----------|-------------|
| #13 Pasos omitibles | Medio | Boton "Omitir" en ventas, compras y retenciones |

Agrega boton "Omitir" en cada step, ajusta step-processing para manejar arrays vacios, y adapta el resumen para ocultar secciones sin datos. Subsume la mejora #8.

**Testing:** Probar todas las combinaciones: solo ventas, solo compras, solo retenciones, ventas+compras, ventas+retenciones, compras+retenciones, y los 3 juntos. Verificar que el resumen y las alertas IA se adaptan correctamente.

---

### Fase 3: Transaccion Atomica + Batch + Vinculacion (Server-Side)
> Prioridad: Alta | Esfuerzo: Alto | Riesgo de regresion: Alto

Unifica las mejoras #1, #2, #4 y #7 en una sola migracion. Al mover todo a una API route con PL/pgSQL transaccional, el batch de retenciones y la vinculacion precisa se implementan dentro de la funcion SQL, evitando hacer trabajo temporal en el cliente que luego se reescribiria.

| Mejora | Esfuerzo | Descripcion |
|--------|----------|-------------|
| #1 Rollback transaccional | Alto | API route + PL/pgSQL transaccional |
| #2 Batch retenciones | — | Incluido en la funcion PL/pgSQL (1 INSERT en vez de N) |
| #4 Vinculacion por num_doc_sustento | — | Incluido en la funcion PL/pgSQL (UPDATE con JOIN) |
| #7 Mover writes a API route | — | Incluido en #1 |

**Implementacion:**
1. Crear funcion PL/pgSQL `import_periodo_completo` que dentro de una sola transaccion:
   - Inserte ventas via `jsonb_to_recordset` (batch)
   - Inserte compras via `jsonb_to_recordset` (batch)
   - Inserte retenciones via `jsonb_to_recordset` (batch, elimina N+1)
   - Vincule retenciones con ventas usando `num_doc_sustento` con fallback a `ruc_emisor` (UPDATE con JOIN, elimina N queries de vinculacion)
   - Si cualquier paso falla, Postgres revierte todo automaticamente
2. Crear API route `POST /api/import/process` con autenticacion server-side
3. Simplificar `step-processing.tsx` a un solo `fetch()`

**Testing:** Probar con datos que causen fallo en cada paso (RUC invalido, constraint violation, etc.) y verificar rollback completo. Probar con 100+ retenciones y verificar que el tiempo no escala linealmente.

**Nota sobre datos parciales existentes:** Si ya existen datos parciales en produccion por importaciones fallidas anteriores, considerar crear un script de limpieza/reconciliacion o documentar como el usuario puede reprocessar un periodo completo.

---

### Fase 4: Componente Reutilizable de Compras
> Prioridad: Media | Esfuerzo: Alto | Riesgo de regresion: Alto

Se ejecuta despues de estabilizar la arquitectura server-side (Fase 3) para evitar refactorizar un componente que luego cambia por debajo.

| Mejora | Esfuerzo | Descripcion |
|--------|----------|-------------|
| #14 ProveedorRubroEditor | Alto | Extraer componente compartido wizard <-> dialog |

1. Crear `src/components/compras/proveedor-rubro-editor.tsx` con todas las funcionalidades del dialog (seleccion masiva, busqueda, iconos, footer totales)
2. Extraer constantes de rubros a archivo compartido
3. Reemplazar tabla inline en `step-compras.tsx` por el componente
4. Reemplazar tabla inline en `importar-compras-dialog.tsx` por el componente
5. Subsume la mejora #12 (memoizacion)

**Testing:** Verificar que ambos contextos (wizard y dialog) funcionan identicamente. Probar con 50+ proveedores: seleccion masiva, busqueda, asignacion por lote, scroll en distintas alturas.

---

### Fase 5: UX y Cleanup
> Prioridad: Baja | Esfuerzo: Bajo | Riesgo de regresion: Bajo

| Mejora | Esfuerzo | Descripcion |
|--------|----------|-------------|
| #3 Deteccion automatica IVA 0% + disclaimer | Bajo | Heuristica + aviso para ventas mixtas |
| #11 Eliminar codigo muerto | Trivial | Borrar `parsearMultiplesXML` |

---

## Notas de Revision

> Estas notas documentan decisiones tomadas durante la revision del plan original.

### Cambios respecto al plan original

1. **Fases reordenadas para evitar retrabajo:** El plan original tenia Fase 4 (batch retenciones) y Fase 5 (transaccion atomica) separadas. El batch hecho en el cliente (Fase 4) se habria reescrito al mover a server-side (Fase 5). Se unificaron en una sola Fase 3.

2. **#14 movido despues de la migracion server-side:** Extraer el componente reutilizable antes de estabilizar como fluyen los datos (client-side vs server-side) habria causado cambios en la interfaz del componente. Ahora se hace sobre base estable.

3. **Hallazgo #15 agregado (validacion por fila):** Los parsers validan headers pero no datos individuales. Filas con campos vacios se insertan sin aviso.

4. **Mejora #3 fortalecida:** Se paso de "solo disclaimer" a deteccion automatica de tarifa 0% cuando `total == subtotal`, con disclaimer solo para casos ambiguos.

5. **Mejora #4 ampliada:** Se agrego nota sobre la suposicion `ruc_emisor == cliente_ruc` que debe validarse contra los flujos reales del SRI.

6. **Testing strategy agregada por fase:** Cada fase incluye que probar y con que datos.

7. **Indicador de riesgo de regresion agregado por fase:** Bajo/Medio/Alto para calibrar el esfuerzo de QA.
