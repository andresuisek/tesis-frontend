# Sistema de Gestion Tributaria

Sistema web para la gestion de obligaciones tributarias de personas naturales en Ecuador. Soporta dos roles: **contribuyente** (gestiona sus propios datos fiscales) y **contador** (gestiona multiples clientes). Incluye un asistente tributario con inteligencia artificial.

Proyecto de tesis de grado de **Andres Ontiveros**.

## Stack Tecnologico

| Capa | Tecnologias |
|------|-------------|
| Framework | Next.js 15.5 (App Router), React 19, TypeScript 5.6 |
| Estilos | Tailwind CSS v4, shadcn/ui, Radix UI, Lucide React |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| IA | OpenAI API (GPT-4o-mini), Tavily (busqueda web) |
| Graficos | Recharts |
| Tablas | TanStack Table, TanStack Query |
| Reportes | xlsx (Excel), @react-pdf/renderer (PDF) |
| Analytics | PostHog (client + server) |
| Notificaciones | Sonner (toasts) |

## Modulos

| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Dashboard | `/dashboard` | Metricas principales, graficos, proximos vencimientos |
| Ventas | `/modules/ventas` | Registro de facturas de venta, desglose por tarifa IVA (0%, 5%, 8%, 15%), exportacion Excel |
| Compras | `/modules/compras` | Facturas de proveedores, clasificacion por rubro de gasto personal, importacion XML/TXT, exportacion Excel |
| Notas de Credito | `/modules/notas-credito` | Notas de credito emitidas, vinculacion con ventas, exportacion Excel |
| Retenciones | `/modules/retenciones` | Retenciones de IVA y Renta recibidas, importacion XML, exportacion Excel |
| Liquidacion IVA | `/modules/liquidacion` | Cierre mensual/semestral de IVA, calculo automatico de impuesto causado, credito tributario, IVA diferido. Descarga PDF |
| Declaracion de Renta | `/modules/declaracion-renta` | Declaracion anual del impuesto a la renta, gastos personales deducibles por categoria con limites legales, tabla progresiva. Descarga PDF |
| Asistente Tributario | `/modules/assistant` | Agente de IA con streaming (SSE), genera SQL desde lenguaje natural, busqueda web, graficos automaticos |
| Clientes | `/modules/clientes` | Gestion de clientes asignados (solo rol contador) |

## Arquitectura

```
src/
├── app/
│   ├── (auth)/                    # Login, registro, confirmacion email
│   │   ├── login/
│   │   ├── registro/
│   │   ├── confirmar-email/
│   │   └── auth/callback/         # OAuth callback
│   ├── (app)/                     # Rutas protegidas (requieren sesion)
│   │   ├── dashboard/
│   │   └── modules/
│   │       ├── ventas/
│   │       ├── compras/
│   │       ├── notas-credito/
│   │       ├── retenciones/
│   │       ├── liquidacion/
│   │       ├── declaracion-renta/
│   │       ├── assistant/
│   │       └── clientes/
│   └── api/
│       ├── auth/registro/         # Registro de usuarios
│       ├── ai-agent/
│       │   ├── query-stream/      # Endpoint principal (SSE streaming)
│       │   ├── query/             # Fallback sin streaming
│       │   └── import-summary/    # Resumen IA de importaciones
│       └── import/
│           ├── process/           # Procesamiento de archivos
│           └── rubro-suggestions/ # Sugerencias de categoria por IA
├── components/
│   ├── ui/                        # shadcn/ui base components
│   ├── ventas/                    # Componentes del modulo ventas
│   ├── compras/                   # Componentes del modulo compras
│   ├── retenciones/               # Componentes del modulo retenciones
│   ├── notas-credito/             # Componentes del modulo notas de credito
│   ├── liquidacion/               # Componentes del modulo liquidacion
│   ├── declaracion-renta/         # Componentes del modulo declaracion
│   ├── assistant/                 # Chat UI, graficos del agente IA
│   ├── clientes/                  # Gestion de clientes (contador)
│   └── filters/                   # Filtro de periodo fiscal global
├── contexts/
│   ├── auth-context.tsx           # Autenticacion y multi-rol
│   └── date-filter-context.tsx    # Filtro de periodo (ano/mes) global
├── hooks/
│   ├── use-compras-table.ts       # Query + filtros + paginacion
│   ├── use-ventas-table.ts
│   ├── use-retenciones-table.ts
│   ├── use-notas-credito-table.ts
│   └── use-available-years.ts
└── lib/
    ├── supabase.ts                # Cliente browser + tipos de la BD
    ├── supabase-admin.ts          # Cliente admin (server-side, service role)
    ├── supabase/
    │   ├── server.ts              # Cliente server components
    │   └── middleware.ts          # Refresh de sesion
    ├── auth-helpers.ts            # getAuthenticatedUser(), verifyRucOwnership()
    ├── liquidacion.ts             # Logica de calculo de liquidacion IVA
    ├── declaracion-renta.ts       # Logica de calculo de impuesto a la renta
    ├── ai-agent/
    │   ├── intent-router.ts       # Clasificacion de intent (database/web/both/app_help)
    │   ├── tavily-search.ts       # Busqueda web con cache 24h
    │   └── ...
    ├── reports/
    │   ├── export-excel.ts        # Utilidad generica para generar .xlsx
    │   ├── compras-excel.ts
    │   ├── ventas-excel.ts
    │   ├── retenciones-excel.ts
    │   ├── notas-credito-excel.ts
    │   ├── liquidacion-pdf.ts     # PDF de liquidacion IVA
    │   ├── declaracion-renta-pdf.ts
    │   └── gastos-personales-pdf.ts
    └── *-parser.ts                # Parsers para XML/TXT de compras, ventas, retenciones
```

## Autenticacion y Roles

El sistema usa **Supabase Auth** con dos tipos de usuario:

- **Contribuyente**: Persona natural que gestiona sus propias obligaciones tributarias.
- **Contador**: Profesional que gestiona multiples contribuyentes como clientes.

El concepto clave es `contribuyenteEfectivo` (del auth context):
- Para un contribuyente: es su propio perfil.
- Para un contador: es el cliente actualmente seleccionado.

Toda la logica de datos filtra por el RUC del `contribuyenteEfectivo`.

## Asistente Tributario (IA)

Pipeline de 2 etapas con streaming SSE:

1. **Clasificacion de intent** (GPT-4o-mini): determina si la pregunta requiere consulta a BD, busqueda web, ambas, o es ayuda de la app.
2. **Generacion de SQL** (si aplica): el modelo genera un `SELECT` seguro, filtrado por RUC, validado contra inyeccion.
3. **Ejecucion**: el SQL se ejecuta via RPC `execute_sql_query` en Supabase.
4. **Respuesta formateada**: metadata (highlights, config de grafico, follow-ups) + narrativa en streaming.

Seguridad: filtrado por RUC, validacion de SQL (no multi-statement, no operaciones destructivas), rate limiting.

## Instalacion

### Prerrequisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) con el proyecto configurado
- API key de [OpenAI](https://platform.openai.com)

### 1. Clonar e instalar

```bash
git clone https://github.com/andresuisek/tesis-frontend.git
cd tesis-frontend
npm install
```

### 2. Variables de entorno

Crear `.env.local` en la raiz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# OpenAI (requerido para el asistente tributario)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Tavily (opcional, habilita busqueda web en el asistente)
TAVILY_API_KEY=tvly-...

# PostHog (opcional, analytics)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Si | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Si | Clave anonima (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Si | Clave admin (server-side, nunca exponer al frontend) |
| `OPENAI_API_KEY` | Si | API key de OpenAI para el agente IA |
| `OPENAI_MODEL` | No | Modelo a usar (default: `gpt-4o-mini`) |
| `TAVILY_API_KEY` | No | Habilita busqueda web en el asistente |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | Analytics con PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | Host de PostHog |

### 3. Ejecutar

```bash
npm run dev        # Desarrollo con Turbopack (http://localhost:3000)
npm run build      # Build de produccion
npm run start      # Servir build de produccion
npm run lint       # Ejecutar ESLint
```

## Base de Datos

El sistema usa PostgreSQL via Supabase con las siguientes tablas principales:

| Tabla | Descripcion |
|-------|-------------|
| `contribuyentes` | Perfil del contribuyente (PK: `ruc`) |
| `contadores` | Perfil del contador |
| `contador_contribuyente` | Relacion N-M entre contadores y contribuyentes |
| `ventas` | Facturas de venta con desglose por tarifa IVA |
| `compras` | Facturas de compra con rubro de gasto personal |
| `notas_credito` | Notas de credito emitidas |
| `retenciones` | Retenciones de IVA y renta recibidas |
| `tax_liquidations` | Cierres mensuales/semestrales de IVA |
| `declaraciones_renta` | Declaraciones anuales de impuesto a la renta |
| `parametros_anuales` | Limites de gastos personales por ano fiscal |
| `tramos_impuesto_renta` | Tabla progresiva del impuesto a la renta |
| `actividades_economicas` | Catalogo de actividades economicas |
| `archivos_cargados` | Registro de archivos importados |

## Importacion de Datos

Se soporta importacion de archivos XML y TXT generados por el SRI o facturacion electronica:

- **Compras**: XML (clave de acceso) o TXT tabulado
- **Ventas**: XML de facturacion electronica
- **Retenciones**: XML de comprobantes de retencion
- **Notas de Credito**: Parseadas desde XML de ventas

Flujo: subir archivo -> parseo automatico -> revision por el usuario -> confirmacion e insercion masiva.

## Reportes

### Excel
Todos los modulos transaccionales (compras, ventas, retenciones, notas de credito) pueden exportarse a `.xlsx`. La exportacion respeta los filtros activos e incluye fila de totales.

### PDF
- **Liquidacion de IVA**: Desglose por tarifas, calculo de impuesto causado, credito tributario, resultado final.
- **Declaracion de Renta**: Ingresos, gastos personales por categoria con limites, base imponible, impuesto causado.
- **Gastos Personales**: Resumen por rubro con porcentaje de uso del techo maximo deducible.

## Autor

**Andres Ontiveros** - Proyecto de Tesis de Grado, 2025
