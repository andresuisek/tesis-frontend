import { formatCurrency } from "./liquidacion";
import {
  DeclaracionRenta,
  ParametrosAnuales,
  TramoImpuestoRenta,
} from "./supabase";

// =============================================================================
// INTERFACES
// =============================================================================

export interface GastoCategoriaDetalle {
  real: number;
  limite: number;
  deducible: number;
}

export interface GastosPersonalesDeducibles {
  vivienda: GastoCategoriaDetalle;
  alimentacion: GastoCategoriaDetalle;
  educacion: GastoCategoriaDetalle;
  vestimenta: GastoCategoriaDetalle;
  salud: GastoCategoriaDetalle;
  turismo: GastoCategoriaDetalle;
  totalReal: number;
  totalDeducible: number;
  topeTotal: number;
  reducidoPorTope: boolean;
}

export interface DeclaracionRentaCalculo {
  ingresosBrutos: number;
  costosGastosDeducibles: number;
  utilidadEjercicio: number;
  gastosPersonales: GastosPersonalesDeducibles;
  baseImponible: number;
  impuestoCausado: number;
  tramoAplicado: TramoImpuestoRenta | null;
  retencionesRenta: number;
  impuestoAPagar: number; // puede ser negativo (saldo a favor)
}

export interface DeclaracionRentaSummaryData {
  anioFiscal: number;
  modoManual: boolean;
  cargasFamiliares: number;
  canastaBasica: number;
  calculo: DeclaracionRentaCalculo;
  fechaLimite: string;
  advertencias: string[];
  notas?: string;
}

export interface DeclaracionRentaCalcInput {
  anioFiscal: number;
  ingresosBrutos: number;
  costosGastosDeducibles: number;
  gastosVivienda: number;
  gastosAlimentacion: number;
  gastosEducacion: number;
  gastosVestimenta: number;
  gastosSalud: number;
  gastosTurismo: number;
  retencionesRenta: number;
  cargasFamiliares: number;
  parametros: ParametrosAnuales;
  tramos: TramoImpuestoRenta[];
  ruc: string;
  modoManual?: boolean;
  advertencias?: string[];
  notas?: string;
}

// =============================================================================
// PLAZOS POR 9NO DÍGITO DEL RUC
// =============================================================================

const PLAZOS_NOVENO_DIGITO: Record<string, number> = {
  "1": 10,
  "2": 12,
  "3": 14,
  "4": 16,
  "5": 18,
  "6": 20,
  "7": 22,
  "8": 24,
  "9": 26,
  "0": 28,
};

export function getFechaLimiteRenta(ruc: string, anioFiscal: number): string {
  const noveno = ruc.charAt(8);
  const dia = PLAZOS_NOVENO_DIGITO[noveno] ?? 28;
  const anioDeclaracion = anioFiscal + 1;
  return `${anioDeclaracion}-03-${String(dia).padStart(2, "0")}`;
}

export function formatFechaLimite(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  const meses = [
    "",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${parseInt(d)} de ${meses[parseInt(m)]} de ${y}`;
}

// =============================================================================
// CÁLCULO DE LÍMITES DE GASTOS PERSONALES
// =============================================================================

const CATEGORIAS = [
  "vivienda",
  "alimentacion",
  "educacion",
  "vestimenta",
  "salud",
  "turismo",
] as const;

type CategoriaGasto = (typeof CATEGORIAS)[number];

const LIMITE_KEYS: Record<CategoriaGasto, keyof ParametrosAnuales> = {
  vivienda: "limite_vivienda",
  alimentacion: "limite_alimentacion",
  educacion: "limite_educacion",
  vestimenta: "limite_vestimenta",
  salud: "limite_salud",
  turismo: "limite_turismo",
};

export function calcularLimitesGastosPersonales(
  gastos: Record<CategoriaGasto, number>,
  parametros: ParametrosAnuales,
  cargasFamiliares: number
): GastosPersonalesDeducibles {
  const canasta7 = parametros.canasta_basica * 7;
  const cargas = Math.min(
    Math.max(0, cargasFamiliares),
    parametros.max_cargas_deduccion
  );

  // Tope total = limite_total_gastos + cargas * incremento_por_carga
  const topeTotal =
    parametros.limite_total_gastos + cargas * parametros.incremento_por_carga;

  // Calcular deducible por categoría (min del gasto real y el límite de la categoría)
  const detalle: Record<CategoriaGasto, GastoCategoriaDetalle> = {} as Record<
    CategoriaGasto,
    GastoCategoriaDetalle
  >;

  let sumaDeducibles = 0;
  let sumaReal = 0;

  for (const cat of CATEGORIAS) {
    const real = Math.max(0, gastos[cat]);
    const coeficiente = Number(parametros[LIMITE_KEYS[cat]]) || 0;
    const limite = coeficiente * canasta7;
    const deducible = Math.min(real, limite);
    detalle[cat] = { real, limite, deducible };
    sumaDeducibles += deducible;
    sumaReal += real;
  }

  // Si la suma excede el tope total, reducir proporcionalmente
  let reducidoPorTope = false;
  if (sumaDeducibles > topeTotal && topeTotal > 0) {
    reducidoPorTope = true;
    const factor = topeTotal / sumaDeducibles;
    sumaDeducibles = 0;
    for (const cat of CATEGORIAS) {
      detalle[cat].deducible = Math.round(detalle[cat].deducible * factor * 100) / 100;
      sumaDeducibles += detalle[cat].deducible;
    }
  }

  return {
    ...detalle,
    totalReal: Math.round(sumaReal * 100) / 100,
    totalDeducible: Math.round(sumaDeducibles * 100) / 100,
    topeTotal: Math.round(topeTotal * 100) / 100,
    reducidoPorTope,
  };
}

// =============================================================================
// CÁLCULO DE IMPUESTO (TABLA PROGRESIVA)
// =============================================================================

export function calcularImpuestoRenta(
  baseImponible: number,
  tramos: TramoImpuestoRenta[]
): { impuesto: number; tramo: TramoImpuestoRenta | null } {
  if (baseImponible <= 0 || tramos.length === 0) {
    return { impuesto: 0, tramo: tramos[0] ?? null };
  }

  const tramosOrdenados = [...tramos].sort((a, b) => a.orden - b.orden);

  for (const tramo of tramosOrdenados) {
    if (
      baseImponible >= tramo.fraccion_basica &&
      baseImponible < tramo.exceso_hasta
    ) {
      const excedente = baseImponible - tramo.fraccion_basica;
      const impuesto =
        tramo.impuesto_fraccion_basica +
        excedente * (tramo.porcentaje_excedente / 100);
      return {
        impuesto: Math.round(impuesto * 100) / 100,
        tramo,
      };
    }
  }

  // Si supera todos los tramos, usar el último
  const ultimo = tramosOrdenados[tramosOrdenados.length - 1];
  const excedente = baseImponible - ultimo.fraccion_basica;
  const impuesto =
    ultimo.impuesto_fraccion_basica +
    excedente * (ultimo.porcentaje_excedente / 100);
  return {
    impuesto: Math.round(impuesto * 100) / 100,
    tramo: ultimo,
  };
}

// =============================================================================
// FUNCIÓN PRINCIPAL DE CÁLCULO
// =============================================================================

export function calculateDeclaracionRenta(
  input: DeclaracionRentaCalcInput
): DeclaracionRentaSummaryData {
  const advertencias = [...(input.advertencias ?? [])];

  const ingresosBrutos = Math.max(0, input.ingresosBrutos);
  const costosGastosDeducibles = Math.max(0, input.costosGastosDeducibles);
  const utilidadEjercicio = Math.max(0, ingresosBrutos - costosGastosDeducibles);

  // Calcular gastos personales deducibles con límites
  const gastosPersonales = calcularLimitesGastosPersonales(
    {
      vivienda: input.gastosVivienda,
      alimentacion: input.gastosAlimentacion,
      educacion: input.gastosEducacion,
      vestimenta: input.gastosVestimenta,
      salud: input.gastosSalud,
      turismo: input.gastosTurismo,
    },
    input.parametros,
    input.cargasFamiliares
  );

  if (gastosPersonales.reducidoPorTope) {
    advertencias.push(
      `Los gastos personales deducibles (${formatCurrency(gastosPersonales.totalReal)}) exceden el tope total permitido (${formatCurrency(gastosPersonales.topeTotal)}). Se aplicó reducción proporcional.`
    );
  }

  // Base imponible = utilidad - gastos personales deducibles
  const baseImponible = Math.max(
    0,
    utilidadEjercicio - gastosPersonales.totalDeducible
  );

  // Impuesto causado según tabla progresiva
  const { impuesto: impuestoCausado, tramo: tramoAplicado } =
    calcularImpuestoRenta(baseImponible, input.tramos);

  // Resultado final
  const retencionesRenta = Math.max(0, input.retencionesRenta);
  const impuestoAPagar =
    Math.round((impuestoCausado - retencionesRenta) * 100) / 100;

  const fechaLimite = getFechaLimiteRenta(input.ruc, input.anioFiscal);

  return {
    anioFiscal: input.anioFiscal,
    modoManual: Boolean(input.modoManual),
    cargasFamiliares: Math.min(
      Math.max(0, input.cargasFamiliares),
      input.parametros.max_cargas_deduccion
    ),
    canastaBasica: input.parametros.canasta_basica,
    calculo: {
      ingresosBrutos,
      costosGastosDeducibles,
      utilidadEjercicio,
      gastosPersonales,
      baseImponible,
      impuestoCausado,
      tramoAplicado,
      retencionesRenta,
      impuestoAPagar,
    },
    fechaLimite,
    advertencias,
    notas: input.notas,
  };
}

// =============================================================================
// MAPEOS DB ↔ SUMMARY
// =============================================================================

export function buildDeclaracionRentaInsertPayload(
  ruc: string,
  summary: DeclaracionRentaSummaryData
) {
  const c = summary.calculo;
  const g = c.gastosPersonales;
  return {
    contribuyente_ruc: ruc,
    anio_fiscal: summary.anioFiscal,
    ingresos_brutos: c.ingresosBrutos,
    costos_gastos_deducibles: c.costosGastosDeducibles,
    utilidad_ejercicio: c.utilidadEjercicio,
    gasto_vivienda: g.vivienda.real,
    gasto_alimentacion: g.alimentacion.real,
    gasto_educacion: g.educacion.real,
    gasto_vestimenta: g.vestimenta.real,
    gasto_salud: g.salud.real,
    gasto_turismo: g.turismo.real,
    gasto_vivienda_deducible: g.vivienda.deducible,
    gasto_alimentacion_deducible: g.alimentacion.deducible,
    gasto_educacion_deducible: g.educacion.deducible,
    gasto_vestimenta_deducible: g.vestimenta.deducible,
    gasto_salud_deducible: g.salud.deducible,
    gasto_turismo_deducible: g.turismo.deducible,
    total_gastos_personales_deducibles: g.totalDeducible,
    base_imponible: c.baseImponible,
    impuesto_causado: c.impuestoCausado,
    retenciones_renta: c.retencionesRenta,
    impuesto_a_pagar: c.impuestoAPagar,
    cargas_familiares_usadas: summary.cargasFamiliares,
    canasta_basica_usada: summary.canastaBasica,
    modo_manual: summary.modoManual,
    notas: summary.notas ?? null,
  };
}

export function mapDeclaracionRentaToSummary(
  row: DeclaracionRenta,
  parametros: ParametrosAnuales,
  tramos: TramoImpuestoRenta[],
  ruc: string
): DeclaracionRentaSummaryData {
  const canasta7 = parametros.canasta_basica * 7;

  const makeCat = (
    real: number,
    deducible: number,
    limKey: keyof ParametrosAnuales
  ): GastoCategoriaDetalle => ({
    real: Number(real) || 0,
    limite: (Number(parametros[limKey]) || 0) * canasta7,
    deducible: Number(deducible) || 0,
  });

  const vivienda = makeCat(row.gasto_vivienda, row.gasto_vivienda_deducible, "limite_vivienda");
  const alimentacion = makeCat(row.gasto_alimentacion, row.gasto_alimentacion_deducible, "limite_alimentacion");
  const educacion = makeCat(row.gasto_educacion, row.gasto_educacion_deducible, "limite_educacion");
  const vestimenta = makeCat(row.gasto_vestimenta, row.gasto_vestimenta_deducible, "limite_vestimenta");
  const salud = makeCat(row.gasto_salud, row.gasto_salud_deducible, "limite_salud");
  const turismo = makeCat(row.gasto_turismo, row.gasto_turismo_deducible, "limite_turismo");

  const totalReal =
    vivienda.real + alimentacion.real + educacion.real +
    vestimenta.real + salud.real + turismo.real;

  const cargas = Math.min(row.cargas_familiares_usadas, parametros.max_cargas_deduccion);
  const topeTotal = parametros.limite_total_gastos + cargas * parametros.incremento_por_carga;
  const totalDeducible = Number(row.total_gastos_personales_deducibles) || 0;

  const { tramo: tramoAplicado } = calcularImpuestoRenta(
    Number(row.base_imponible) || 0,
    tramos
  );

  return {
    anioFiscal: row.anio_fiscal,
    modoManual: row.modo_manual,
    cargasFamiliares: row.cargas_familiares_usadas,
    canastaBasica: Number(row.canasta_basica_usada) || parametros.canasta_basica,
    calculo: {
      ingresosBrutos: Number(row.ingresos_brutos) || 0,
      costosGastosDeducibles: Number(row.costos_gastos_deducibles) || 0,
      utilidadEjercicio: Number(row.utilidad_ejercicio) || 0,
      gastosPersonales: {
        vivienda,
        alimentacion,
        educacion,
        vestimenta,
        salud,
        turismo,
        totalReal,
        totalDeducible,
        topeTotal,
        reducidoPorTope: totalDeducible < totalReal && totalDeducible <= topeTotal,
      },
      baseImponible: Number(row.base_imponible) || 0,
      impuestoCausado: Number(row.impuesto_causado) || 0,
      tramoAplicado,
      retencionesRenta: Number(row.retenciones_renta) || 0,
      impuestoAPagar: Number(row.impuesto_a_pagar) || 0,
    },
    fechaLimite: getFechaLimiteRenta(ruc, row.anio_fiscal),
    advertencias: [],
    notas: row.notas ?? undefined,
  };
}

export { formatCurrency };
