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
  base5: Number(valores?.base5) || 0,
  base8: Number(valores?.base8) || 0,
  base15: Number(valores?.base15) || 0,
  iva: Number(valores?.iva) || 0,
});

export const calcularIVA = (v: LiquidacionValoresIVA): number =>
  v.base5 * 0.05 + v.base8 * 0.08 + v.base15 * 0.15;

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
  base5: number;
  base8: number;
  base15: number;
  iva: number;
}

export interface CreditoTributarioInfo {
  ctPorAdquisicionAnterior: number;  // CT adquisición del periodo anterior
  ctPorRetencionAnterior: number;    // CT retención del periodo anterior
  retencionesIvaPeriodo: number;     // Retenciones IVA recibidas este periodo
  ctPorAdquisicion: number;          // CT adquisición resultante (arrastra)
  ctPorRetencion: number;            // CT retención resultante (arrastra)
}

export interface IvaDiferidoInfo {
  ivaVentasTotal: number;
  ivaDiferidoMonto: number;
  mesesDiferimiento: number;
  ivaVentasPeriodo: number;
  ivaDiferidoRecibido: number;
}

export interface LiquidacionAjustes {
  ctAdquisicionAnterior: number;
  ctRetencionAnterior: number;
  advertencias: string[];
}

export interface LiquidacionCalculo {
  ivaVentasTotal: number;
  ivaComprasTotal: number;
  ivaDiferidoMonto: number;
  ivaVentasPeriodo: number;
  ivaDiferidoRecibido: number;
  impuestoCausado: number;
  creditoAdquisicionMes: number;
  ctAdquisicionUsado: number;
  ctRetencionUsado: number;
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
  creditoTributario: CreditoTributarioInfo;
  retencionesRenta: number;
  ivaDiferido: IvaDiferidoInfo;
  ajustes: LiquidacionAjustes;
  calculo: LiquidacionCalculo;
  notas?: string;
}

export interface LiquidacionCalcInput {
  periodo: PeriodInfo;
  tipoPeriodo: PeriodType;
  ventas?: Partial<LiquidacionValoresIVA>;
  compras?: Partial<LiquidacionValoresIVA>;
  ctPorAdquisicionAnterior?: number;
  ctPorRetencionAnterior?: number;
  retencionesIvaPeriodo?: number;
  retencionesRenta?: number;
  rentaAPagar?: number;
  ivaDiferidoMonto?: number;
  mesesDiferimiento?: number;
  ivaDiferidoRecibido?: number;
  advertencias?: string[];
  modoManual?: boolean;
  notas?: string;
}

export function calculateLiquidacionResumen({
  periodo,
  tipoPeriodo,
  ventas,
  compras,
  ctPorAdquisicionAnterior,
  ctPorRetencionAnterior,
  retencionesIvaPeriodo,
  retencionesRenta,
  rentaAPagar,
  ivaDiferidoMonto,
  mesesDiferimiento,
  ivaDiferidoRecibido,
  advertencias,
  modoManual,
  notas,
}: LiquidacionCalcInput): LiquidacionSummaryData {
  const ventasValores = normalizeValores(ventas);
  const comprasValores = normalizeValores(compras);
  const retRenta = toPositiveNumber(retencionesRenta);
  const ctAdquisicionAnt = toPositiveNumber(ctPorAdquisicionAnterior);
  const ctRetencionAnt = toPositiveNumber(ctPorRetencionAnterior);
  const retIvaPeriodo = toPositiveNumber(retencionesIvaPeriodo);
  const rentaPagar = toPositiveNumber(rentaAPagar);
  const diferidoRecibido = toPositiveNumber(ivaDiferidoRecibido);

  const registerAdvertencias = [...(advertencias ?? [])];

  // 1. Auto-calculate IVA from bases
  const ivaVentasTotal = calcularIVA(ventasValores);
  const ivaComprasTotal = calcularIVA(comprasValores);

  // Update iva field on valores for display consistency
  ventasValores.iva = ivaVentasTotal;
  comprasValores.iva = ivaComprasTotal;

  // 2. IVA diferido
  const diferidoMonto = Math.min(
    toPositiveNumber(ivaDiferidoMonto),
    ivaVentasTotal
  );
  const mesesDif = diferidoMonto > 0 ? Math.max(0, Math.min(3, Number(mesesDiferimiento) || 0)) : 0;
  const ivaVentasPeriodo = ivaVentasTotal - diferidoMonto;

  // 3. Resultado intermedio: IVA Ventas vs IVA Compras
  const resultado = (ivaVentasPeriodo + diferidoRecibido) - ivaComprasTotal;
  const impuestoCausado = resultado > 0 ? resultado : 0;
  const creditoAdquisicionMes = resultado <= 0 ? Math.abs(resultado) : 0;

  // 4. PRELACIÓN de créditos tributarios (solo si hay impuesto causado)
  let pendiente = impuestoCausado;
  let ctAdquisicionUsado = 0;
  let ctRetencionUsado = 0;

  if (pendiente > 0) {
    // a. Primero compensar con CT por adquisición anterior
    ctAdquisicionUsado = Math.min(pendiente, ctAdquisicionAnt);
    pendiente -= ctAdquisicionUsado;

    // b. Luego compensar con CT por retención anterior
    ctRetencionUsado = Math.min(pendiente, ctRetencionAnt);
    pendiente -= ctRetencionUsado;
  }

  // 5. Resultado final
  const ivaAPagar = Math.max(0, pendiente);

  // 6. CT resultante que arrastra al siguiente periodo
  const ctPorAdquisicionResultante =
    (ctAdquisicionAnt - ctAdquisicionUsado) + creditoAdquisicionMes;
  const ctPorRetencionResultante =
    (ctRetencionAnt - ctRetencionUsado) + retIvaPeriodo;
  const saldoAFavor = ctPorAdquisicionResultante + ctPorRetencionResultante;

  const totalAPagar = ivaAPagar + rentaPagar;

  return {
    periodo,
    tipoPeriodo,
    modoManual: Boolean(modoManual),
    ventas: ventasValores,
    compras: comprasValores,
    creditoTributario: {
      ctPorAdquisicionAnterior: ctAdquisicionAnt,
      ctPorRetencionAnterior: ctRetencionAnt,
      retencionesIvaPeriodo: retIvaPeriodo,
      ctPorAdquisicion: ctPorAdquisicionResultante,
      ctPorRetencion: ctPorRetencionResultante,
    },
    retencionesRenta: retRenta,
    ivaDiferido: {
      ivaVentasTotal,
      ivaDiferidoMonto: diferidoMonto,
      mesesDiferimiento: mesesDif,
      ivaVentasPeriodo,
      ivaDiferidoRecibido: diferidoRecibido,
    },
    ajustes: {
      ctAdquisicionAnterior: ctAdquisicionAnt,
      ctRetencionAnterior: ctRetencionAnt,
      advertencias: registerAdvertencias,
    },
    calculo: {
      ivaVentasTotal,
      ivaComprasTotal,
      ivaDiferidoMonto: diferidoMonto,
      ivaVentasPeriodo,
      ivaDiferidoRecibido: diferidoRecibido,
      impuestoCausado,
      creditoAdquisicionMes,
      ctAdquisicionUsado,
      ctRetencionUsado,
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
  // Legacy columns (backward compatibility)
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
  // New columns
  total_ventas_base_5: number;
  total_ventas_base_8: number;
  total_ventas_base_15: number;
  total_compras_base_5: number;
  total_compras_base_8: number;
  total_compras_base_15: number;
  iva_ventas: number;
  iva_compras: number;
  ct_por_adquisicion: number;
  ct_por_retencion: number;
  iva_diferido_monto: number;
  iva_diferido_meses: number;
  iva_diferido_recibido: number;
  credito_arrastrado_anterior: number;
  saldo_a_favor: number;
}

export function buildInsertPayloadFromSummary(
  contribuyente_ruc: string,
  summary: LiquidacionSummaryData,
  options?: { totalNcIVAMayor0?: number }
): TaxLiquidationInsertPayload {
  const totalVentasGravadas =
    summary.ventas.base5 + summary.ventas.base8 + summary.ventas.base15;
  const totalComprasGravadas =
    summary.compras.base5 + summary.compras.base8 + summary.compras.base15;

  return {
    contribuyente_ruc,
    fecha_inicio_cierre: summary.periodo.startDate,
    fecha_fin_cierre: summary.periodo.endDate,
    // Legacy columns
    total_compras_iva_0: summary.compras.base0,
    total_compras_iva_mayor_0: totalComprasGravadas,
    total_ventas_iva_0: summary.ventas.base0,
    total_ventas_iva_mayor_0: totalVentasGravadas,
    total_nc_iva_mayor_0: options?.totalNcIVAMayor0 ?? 0,
    total_retenciones_iva_mayor_0: summary.creditoTributario.retencionesIvaPeriodo,
    credito_favor_adquisicion: summary.calculo.ivaComprasTotal,
    credito_favor_retencion: summary.retencionesRenta,
    impuesto_pagar_sri: summary.calculo.totalAPagar,
    impuesto_causado: summary.calculo.impuestoCausado,
    // New columns
    total_ventas_base_5: summary.ventas.base5,
    total_ventas_base_8: summary.ventas.base8,
    total_ventas_base_15: summary.ventas.base15,
    total_compras_base_5: summary.compras.base5,
    total_compras_base_8: summary.compras.base8,
    total_compras_base_15: summary.compras.base15,
    iva_ventas: summary.calculo.ivaVentasTotal,
    iva_compras: summary.calculo.ivaComprasTotal,
    ct_por_adquisicion: summary.creditoTributario.ctPorAdquisicion,
    ct_por_retencion: summary.creditoTributario.ctPorRetencion,
    iva_diferido_monto: summary.ivaDiferido.ivaDiferidoMonto,
    iva_diferido_meses: summary.ivaDiferido.mesesDiferimiento,
    iva_diferido_recibido: summary.ivaDiferido.ivaDiferidoRecibido,
    credito_arrastrado_anterior: summary.ajustes.ctAdquisicionAnterior + summary.ajustes.ctRetencionAnterior,
    saldo_a_favor: summary.calculo.saldoAFavor,
  };
}

export function mapTaxLiquidationToSummary(
  row: TaxLiquidation
): LiquidacionSummaryData {
  const { info, tipoPeriodo } = buildPeriodInfoFromRange(
    row.fecha_inicio_cierre,
    row.fecha_fin_cierre
  );

  // Check if new columns are populated (non-zero iva_ventas means new format)
  const hasNewColumns = (Number(row.iva_ventas) || 0) > 0 ||
    (Number(row.iva_compras) || 0) > 0 ||
    (Number(row.total_ventas_base_5) || 0) > 0 ||
    (Number(row.total_ventas_base_8) || 0) > 0 ||
    (Number(row.total_ventas_base_15) || 0) > 0;

  if (hasNewColumns) {
    // New format: read from new columns
    const ventasBase5 = Number(row.total_ventas_base_5) || 0;
    const ventasBase8 = Number(row.total_ventas_base_8) || 0;
    const ventasBase15 = Number(row.total_ventas_base_15) || 0;
    const comprasBase5 = Number(row.total_compras_base_5) || 0;
    const comprasBase8 = Number(row.total_compras_base_8) || 0;
    const comprasBase15 = Number(row.total_compras_base_15) || 0;
    const ivaVentas = Number(row.iva_ventas) || 0;
    const ivaCompras = Number(row.iva_compras) || 0;
    const diferidoMonto = Number(row.iva_diferido_monto) || 0;
    const diferidoMeses = Number(row.iva_diferido_meses) || 0;
    const diferidoRecibido = Number(row.iva_diferido_recibido) || 0;
    const saldoAFavor = Number(row.saldo_a_favor) || 0;
    const impuestoPagar = Number(row.impuesto_pagar_sri) || 0;
    const impuestoCausado = Number(row.impuesto_causado) || 0;

    const ivaVentasPeriodo = ivaVentas - diferidoMonto;
    const ctPorAdquisicionRes = Number(row.ct_por_adquisicion) || 0;
    const ctPorRetencionRes = Number(row.ct_por_retencion) || 0;
    const retencionesIvaPeriodo = Number(row.total_retenciones_iva_mayor_0) || 0;
    const creditoAdquisicionMes = impuestoCausado === 0
      ? Math.max(0, ivaCompras - (ivaVentasPeriodo + diferidoRecibido))
      : 0;

    return {
      periodo: info,
      tipoPeriodo,
      modoManual: false,
      ventas: {
        base0: Number(row.total_ventas_iva_0) || 0,
        base5: ventasBase5,
        base8: ventasBase8,
        base15: ventasBase15,
        iva: ivaVentas,
      },
      compras: {
        base0: Number(row.total_compras_iva_0) || 0,
        base5: comprasBase5,
        base8: comprasBase8,
        base15: comprasBase15,
        iva: ivaCompras,
      },
      creditoTributario: {
        ctPorAdquisicionAnterior: 0,
        ctPorRetencionAnterior: 0,
        retencionesIvaPeriodo,
        ctPorAdquisicion: ctPorAdquisicionRes,
        ctPorRetencion: ctPorRetencionRes,
      },
      retencionesRenta: Number(row.credito_favor_retencion) || 0,
      ivaDiferido: {
        ivaVentasTotal: ivaVentas,
        ivaDiferidoMonto: diferidoMonto,
        mesesDiferimiento: diferidoMeses,
        ivaVentasPeriodo,
        ivaDiferidoRecibido: diferidoRecibido,
      },
      ajustes: {
        ctAdquisicionAnterior: 0,
        ctRetencionAnterior: 0,
        advertencias: [],
      },
      calculo: {
        ivaVentasTotal: ivaVentas,
        ivaComprasTotal: ivaCompras,
        ivaDiferidoMonto: diferidoMonto,
        ivaVentasPeriodo,
        ivaDiferidoRecibido: diferidoRecibido,
        impuestoCausado,
        creditoAdquisicionMes,
        ctAdquisicionUsado: 0,
        ctRetencionUsado: 0,
        ivaAPagar: Math.max(0, impuestoPagar),
        saldoAFavor,
        rentaAPagar: 0,
        totalAPagar: Math.max(0, impuestoPagar),
      },
      notas: undefined,
    };
  }

  // Legacy format: fallback to old columns
  const totalVentasGravadas = Number(row.total_ventas_iva_mayor_0) || 0;
  const totalComprasGravadas = Number(row.total_compras_iva_mayor_0) || 0;
  const ivaCausado = Number(row.impuesto_causado) || 0;
  const creditoCompras = Number(row.credito_favor_adquisicion) || 0;
  const retencionesRenta = Number(row.credito_favor_retencion) || 0;
  const impuestoPagar = Number(row.impuesto_pagar_sri) || 0;
  const saldoAFavor = Math.max(0, creditoCompras - ivaCausado);

  return {
    periodo: info,
    tipoPeriodo,
    modoManual: false,
    ventas: {
      base0: Number(row.total_ventas_iva_0) || 0,
      base5: 0,
      base8: totalVentasGravadas,
      base15: 0,
      iva: ivaCausado,
    },
    compras: {
      base0: Number(row.total_compras_iva_0) || 0,
      base5: 0,
      base8: totalComprasGravadas,
      base15: 0,
      iva: creditoCompras,
    },
    creditoTributario: {
      ctPorAdquisicionAnterior: 0,
      ctPorRetencionAnterior: 0,
      retencionesIvaPeriodo: 0,
      ctPorAdquisicion: 0,
      ctPorRetencion: 0,
    },
    retencionesRenta,
    ivaDiferido: {
      ivaVentasTotal: ivaCausado,
      ivaDiferidoMonto: 0,
      mesesDiferimiento: 0,
      ivaVentasPeriodo: ivaCausado,
      ivaDiferidoRecibido: 0,
    },
    ajustes: {
      ctAdquisicionAnterior: 0,
      ctRetencionAnterior: 0,
      advertencias: [],
    },
    calculo: {
      ivaVentasTotal: ivaCausado,
      ivaComprasTotal: creditoCompras,
      ivaDiferidoMonto: 0,
      ivaVentasPeriodo: ivaCausado,
      ivaDiferidoRecibido: 0,
      impuestoCausado: ivaCausado,
      creditoAdquisicionMes: 0,
      ctAdquisicionUsado: 0,
      ctRetencionUsado: 0,
      ivaAPagar: Math.max(0, impuestoPagar),
      saldoAFavor,
      rentaAPagar: 0,
      totalAPagar: Math.max(0, impuestoPagar),
    },
    notas: undefined,
  };
}

