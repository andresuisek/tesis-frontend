import dayjs from "dayjs";
import "dayjs/locale/es";
import { TaxLiquidation } from "./supabase";

dayjs.locale("es");

export type PeriodType = "mensual" | "semestral";
export type SemesterValue = "S1" | "S2";

export interface PeriodSelection {
  tipo: PeriodType;
  year: number;
  month?: number; // 1-12 para periodos mensuales
  semestre?: SemesterValue;
}

export interface PeriodInfo {
  periodoId: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
}

export const MONTH_OPTIONS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const formatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (value: number) => formatter.format(value || 0);

const toPositiveNumber = (value?: number) =>
  Number.isFinite(value) ? Math.max(0, Number(value)) : 0;

const normalizeValores = (
  valores?: Partial<LiquidacionValoresIVA>
): LiquidacionValoresIVA => ({
  base0: Number(valores?.base0) || 0,
  base8: Number(valores?.base8) || 0,
  base15: Number(valores?.base15) || 0,
  iva: Number(valores?.iva) || 0,
});

export function buildPeriodInfo(selection: PeriodSelection): PeriodInfo {
  if (selection.tipo === "mensual") {
    if (!selection.month) {
      throw new Error("El mes es requerido para un periodo mensual.");
    }
    const start = dayjs()
      .year(selection.year)
      .month(selection.month - 1)
      .startOf("month");
    const end = start.endOf("month");
    return {
      periodoId: `${selection.year}-${String(selection.month).padStart(2, "0")}`,
      label: start.format("MMMM YYYY"),
      startDate: start.format("YYYY-MM-DD"),
      endDate: end.format("YYYY-MM-DD"),
      dueDate: end.add(1, "month").date(12).format("YYYY-MM-DD"),
    };
  }

  const semestre = selection.semestre ?? "S1";
  const startMonth = semestre === "S1" ? 0 : 6;
  const endMonth = semestre === "S1" ? 5 : 11;
  const start = dayjs().year(selection.year).month(startMonth).startOf("month");
  const end = dayjs().year(selection.year).month(endMonth).endOf("month");

  return {
    periodoId: `${selection.year}-${semestre}`,
    label: `${semestre === "S1" ? "1er" : "2do"} semestre ${selection.year}`,
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
    dueDate: end.add(1, "month").date(12).format("YYYY-MM-DD"),
  };
}

export function getPreviousSelection(
  selection: PeriodSelection
): PeriodSelection {
  if (selection.tipo === "mensual") {
    const month = selection.month ?? 1;
    if (month === 1) {
      return { tipo: "mensual", year: selection.year - 1, month: 12 };
    }
    return { tipo: "mensual", year: selection.year, month: month - 1 };
  }

  const current = selection.semestre ?? "S1";
  if (current === "S2") {
    return { tipo: "semestral", year: selection.year, semestre: "S1" };
  }
  return { tipo: "semestral", year: selection.year - 1, semestre: "S2" };
}

export function periodHasFinished(
  info: PeriodInfo,
  referenceDate = dayjs()
): boolean {
  return dayjs(info.endDate).isBefore(referenceDate.startOf("month"));
}

export function buildPeriodInfoFromRange(
  start: string,
  end: string
): { info: PeriodInfo; tipoPeriodo: PeriodType } {
  const startDate = dayjs(start);
  const endDate = dayjs(end);
  const monthDiff = endDate.endOf("month").diff(startDate.startOf("month"), "month");
  const tipoPeriodo: PeriodType = monthDiff >= 5 ? "semestral" : "mensual";
  const periodoId =
    tipoPeriodo === "mensual"
      ? `${startDate.year()}-${String(startDate.month() + 1).padStart(2, "0")}`
      : `${startDate.year()}-${startDate.month() < 6 ? "S1" : "S2"}`;
  const label =
    tipoPeriodo === "mensual"
      ? startDate.format("MMMM YYYY")
      : `${startDate.month() < 6 ? "1er" : "2do"} semestre ${startDate.year()}`;

  return {
    info: {
      periodoId,
      label,
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate.format("YYYY-MM-DD"),
      dueDate: endDate.add(1, "month").date(12).format("YYYY-MM-DD"),
    },
    tipoPeriodo,
  };
}

export interface LiquidacionValoresIVA {
  base0: number;
  base8: number;
  base15: number;
  iva: number;
}

export interface RetencionesInfo {
  iva: number;
  renta: number;
}

export interface LiquidacionAjustes {
  creditoArrastradoAnterior: number;
  creditoAplicadoAnterior: number;
  creditoRemanenteAnterior: number;
  creditoGeneradoPeriodo: number;
  advertencias: string[];
}

export interface LiquidacionCalculo {
  ivaCausado: number;
  creditoTributarioCompras: number;
  retencionesIVA: number;
  ivaAPagar: number;
  saldoAFavor: number;
  rentaAPagar: number;
  totalAPagar: number;
}

export interface LiquidacionSummaryData {
  periodo: PeriodInfo;
  tipoPeriodo: PeriodType;
  modoManual: boolean;
  ventas: LiquidacionValoresIVA;
  compras: LiquidacionValoresIVA;
  retenciones: RetencionesInfo;
  ajustes: LiquidacionAjustes;
  calculo: LiquidacionCalculo;
  notas?: string;
}

export interface LiquidacionCalcInput {
  periodo: PeriodInfo;
  tipoPeriodo: PeriodType;
  ventas?: Partial<LiquidacionValoresIVA>;
  compras?: Partial<LiquidacionValoresIVA>;
  retencionesIVA?: number;
  retencionesRenta?: number;
  creditoArrastradoAnterior?: number;
  rentaAPagar?: number;
  advertencias?: string[];
  modoManual?: boolean;
  notas?: string;
}

export function calculateLiquidacionResumen({
  periodo,
  tipoPeriodo,
  ventas,
  compras,
  retencionesIVA,
  retencionesRenta,
  creditoArrastradoAnterior,
  rentaAPagar,
  advertencias,
  modoManual,
  notas,
}: LiquidacionCalcInput): LiquidacionSummaryData {
  const ventasValores = normalizeValores(ventas);
  const comprasValores = normalizeValores(compras);
  const retIva = toPositiveNumber(retencionesIVA);
  const retRenta = toPositiveNumber(retencionesRenta);
  const creditoAnterior = toPositiveNumber(creditoArrastradoAnterior);
  const rentaPagar = toPositiveNumber(rentaAPagar);

  const registerAdvertencias = [...(advertencias ?? [])];

  const ivaBase = ventasValores.iva - comprasValores.iva;
  let ivaPendiente = ivaBase;
  let creditoAplicadoAnterior = 0;
  let creditoRemanenteAnterior = creditoAnterior;
  let creditoGeneradoPeriodo = 0;

  if (ivaPendiente <= 0) {
    creditoGeneradoPeriodo += Math.abs(ivaPendiente);
    ivaPendiente = 0;
  } else if (creditoAnterior > 0) {
    creditoAplicadoAnterior = Math.min(ivaPendiente, creditoAnterior);
    ivaPendiente -= creditoAplicadoAnterior;
    creditoRemanenteAnterior = creditoAnterior - creditoAplicadoAnterior;
    if (ivaPendiente <= 0) {
      creditoGeneradoPeriodo += Math.abs(ivaPendiente);
      ivaPendiente = 0;
    }
  }

  if (ivaPendiente > 0) {
    ivaPendiente -= retIva;
    if (ivaPendiente < 0) {
      creditoGeneradoPeriodo += Math.abs(ivaPendiente);
      ivaPendiente = 0;
    }
  } else if (retIva > 0) {
    creditoGeneradoPeriodo += retIva;
  }

  const ivaAPagar = Math.max(0, ivaPendiente);
  const saldoAFavor = creditoRemanenteAnterior + creditoGeneradoPeriodo;
  const totalAPagar = ivaAPagar + rentaPagar;

  return {
    periodo,
    tipoPeriodo,
    modoManual: Boolean(modoManual),
    ventas: ventasValores,
    compras: comprasValores,
    retenciones: {
      iva: retIva,
      renta: retRenta,
    },
    ajustes: {
      creditoArrastradoAnterior: creditoAnterior,
      creditoAplicadoAnterior,
      creditoRemanenteAnterior,
      creditoGeneradoPeriodo,
      advertencias: registerAdvertencias,
    },
    calculo: {
      ivaCausado: ventasValores.iva,
      creditoTributarioCompras: comprasValores.iva,
      retencionesIVA: retIva,
      ivaAPagar,
      saldoAFavor,
      rentaAPagar: rentaPagar,
      totalAPagar,
    },
    notas,
  };
}

export interface TaxLiquidationInsertPayload {
  contribuyente_ruc: string;
  fecha_inicio_cierre: string;
  fecha_fin_cierre: string;
  total_compras_iva_0: number;
  total_compras_iva_mayor_0: number;
  total_ventas_iva_0: number;
  total_ventas_iva_mayor_0: number;
  total_nc_iva_mayor_0: number;
  total_retenciones_iva_mayor_0: number;
  credito_favor_adquisicion: number;
  credito_favor_retencion: number;
  impuesto_pagar_sri: number;
  impuesto_causado: number;
}

export function buildInsertPayloadFromSummary(
  contribuyente_ruc: string,
  summary: LiquidacionSummaryData,
  options?: { totalNcIVAMayor0?: number }
): TaxLiquidationInsertPayload {
  const totalVentasGravadas = summary.ventas.base8 + summary.ventas.base15;
  const totalComprasGravadas = summary.compras.base8 + summary.compras.base15;
  return {
    contribuyente_ruc,
    fecha_inicio_cierre: summary.periodo.startDate,
    fecha_fin_cierre: summary.periodo.endDate,
    total_compras_iva_0: summary.compras.base0,
    total_compras_iva_mayor_0: totalComprasGravadas,
    total_ventas_iva_0: summary.ventas.base0,
    total_ventas_iva_mayor_0: totalVentasGravadas,
    total_nc_iva_mayor_0: options?.totalNcIVAMayor0 ?? 0,
    total_retenciones_iva_mayor_0: summary.retenciones.iva,
    credito_favor_adquisicion: summary.compras.iva,
    credito_favor_retencion: summary.retenciones.renta,
    impuesto_pagar_sri: summary.calculo.totalAPagar,
    impuesto_causado: summary.calculo.ivaCausado,
  };
}

export function mapTaxLiquidationToSummary(
  row: TaxLiquidation
): LiquidacionSummaryData {
  if (typeof window !== "undefined") {
    console.log("[Liquidacion] Valores crudos tax_liquidations", {
      id: row.id,
      total_compras_iva_0: row.total_compras_iva_0,
      total_compras_iva_mayor_0: row.total_compras_iva_mayor_0,
      credito_favor_adquisicion: row.credito_favor_adquisicion,
    });
  }

  const { info, tipoPeriodo } = buildPeriodInfoFromRange(
    row.fecha_inicio_cierre,
    row.fecha_fin_cierre
  );

  const totalVentasGravadas = Number(row.total_ventas_iva_mayor_0) || 0;
  const totalComprasGravadas = Number(row.total_compras_iva_mayor_0) || 0;
  const ivaCausado = Number(row.impuesto_causado) || 0;
  const creditoCompras = Number(row.credito_favor_adquisicion) || 0;
  const retencionesIva = Number(row.total_retenciones_iva_mayor_0) || 0;
  const retencionesRenta = Number(row.credito_favor_retencion) || 0;
  const impuestoPagar = Number(row.impuesto_pagar_sri) || 0;
  const saldoAFavor = Math.max(0, creditoCompras + retencionesIva - ivaCausado);

  return {
    periodo: info,
    tipoPeriodo,
    modoManual: false,
    ventas: {
      base0: Number(row.total_ventas_iva_0) || 0,
      base8: totalVentasGravadas,
      base15: 0,
      iva: ivaCausado,
    },
    compras: {
      base0: Number(row.total_compras_iva_0) || 0,
      base8: totalComprasGravadas,
      base15: 0,
      iva: creditoCompras,
    },
    retenciones: {
      iva: retencionesIva,
      renta: retencionesRenta,
    },
    ajustes: {
      creditoArrastradoAnterior: 0,
      creditoAplicadoAnterior: 0,
      creditoRemanenteAnterior: saldoAFavor,
      creditoGeneradoPeriodo: 0,
      advertencias: [],
    },
    calculo: {
      ivaCausado,
      creditoTributarioCompras: creditoCompras,
      retencionesIVA: retencionesIva,
      ivaAPagar: Math.max(0, impuestoPagar),
      saldoAFavor,
      rentaAPagar: 0,
      totalAPagar: Math.max(0, impuestoPagar),
    },
    notas: undefined,
  };
}

