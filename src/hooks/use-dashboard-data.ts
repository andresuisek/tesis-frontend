"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useDateFilter } from "@/contexts/date-filter-context";
import dayjs from "dayjs";

export interface DashboardKPIs {
  ventasMes: number;
  comprasMes: number;
  ivaPagar: number;
  ivaVentas: number;
  ivaCompras: number;
  retencionesMes: number;
  ventasMesAnterior: number;
  comprasMesAnterior: number;
  retencionesMesAnterior: number;
}

export interface MonthlyData {
  month: string;
  ventas: number;
  compras: number;
  utilidad: number;
  retenciones: number;
  notasCredito: number;
}

export interface DailyData {
  date: string;
  ventas: number;
  compras: number;
}

export interface RecentActivity {
  type: string;
  amount: number;
  timestamp: string;
  id: string;
  counterpartyName: string;
  counterpartyRuc: string;
  comprobante: string;
}

export interface TaxStatus {
  hasCurrentLiquidation: boolean;
  hasTransactions: boolean;
  documentCounts: {
    ventas: number;
    compras: number;
    retenciones: number;
  };
}

export interface RubroDistribution {
  rubro: string;
  total: number;
}

export interface IvaBreakdownItem {
  rate: string;
  ventas: number;
  compras: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  monthlyData: MonthlyData[];
  dailyData: DailyData[];
  rubroDistribution: RubroDistribution[];
  ivaBreakdown: IvaBreakdownItem[];
  recentActivity: RecentActivity[];
  taxStatus: TaxStatus;
  loading: boolean;
  error: string | null;
}

/** Tipo interno sin los campos de estado (loading/error) que gestiona React Query */
interface DashboardPayload {
  kpis: DashboardKPIs;
  monthlyData: MonthlyData[];
  dailyData: DailyData[];
  rubroDistribution: RubroDistribution[];
  ivaBreakdown: IvaBreakdownItem[];
  recentActivity: RecentActivity[];
  taxStatus: TaxStatus;
}

async function fetchDashboardData(
  ruc: string,
  selectedYear: number,
  selectedMonth: number | null,
): Promise<DashboardPayload> {
  const currentPeriodStart =
    selectedMonth !== null
      ? dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .startOf("month")
      : dayjs().year(selectedYear).startOf("year");
  const currentPeriodEnd =
    selectedMonth !== null
      ? dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .endOf("month")
      : dayjs().year(selectedYear).endOf("year");

  const previousReference =
    selectedMonth !== null
      ? currentPeriodStart.subtract(1, "month")
      : currentPeriodStart.subtract(1, "year");
  const previousPeriodStart =
    selectedMonth !== null
      ? previousReference.startOf("month")
      : previousReference.startOf("year");
  const previousPeriodEnd =
    selectedMonth !== null
      ? previousReference.endOf("month")
      : previousReference.endOf("year");

  const monthsWindow = 12;
  const monthlyRangeStart =
    selectedMonth !== null
      ? currentPeriodStart.subtract(11, "month")
      : dayjs().year(selectedYear).startOf("year");
  const monthlyRangeEnd =
    selectedMonth !== null
      ? currentPeriodEnd
      : dayjs().year(selectedYear).endOf("year");

  const currentStart = currentPeriodStart.format("YYYY-MM-DD");
  const currentEnd = currentPeriodEnd.format("YYYY-MM-DD");
  const previousStart = previousPeriodStart.format("YYYY-MM-DD");
  const previousEnd = previousPeriodEnd.format("YYYY-MM-DD");
  const monthlyStart = monthlyRangeStart.format("YYYY-MM-DD");
  const monthlyEnd = monthlyRangeEnd.format("YYYY-MM-DD");

  // Ejecutar todas las queries en paralelo
  const [
    ventasMesResult,
    ventasMesAntResult,
    comprasMesResult,
    comprasMesAntResult,
    retencionesMesResult,
    retencionesMesAntResult,
    ventasAnuales,
    comprasAnuales,
    ventasMensualesResult,
    comprasMensualesResult,
    retencionesMensualesResult,
    notasCreditoMensualesResult,
    recentVentasResult,
    recentComprasResult,
    taxLiquidationsResult,
  ] = await Promise.all([
    // Ventas del periodo actual
    supabase
      .from("ventas")
      .select("total, iva, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", currentStart)
      .lte("fecha_emision", currentEnd),
    // Ventas del periodo anterior
    supabase
      .from("ventas")
      .select("total")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", previousStart)
      .lte("fecha_emision", previousEnd),
    // Compras del periodo actual
    supabase
      .from("compras")
      .select("total, iva, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", currentStart)
      .lte("fecha_emision", currentEnd),
    // Compras del periodo anterior
    supabase
      .from("compras")
      .select("total")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", previousStart)
      .lte("fecha_emision", previousEnd),
    // Retenciones del periodo actual
    supabase
      .from("retenciones")
      .select("retencion_valor, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", currentStart)
      .lte("fecha_emision", currentEnd),
    // Retenciones del periodo anterior
    supabase
      .from("retenciones")
      .select("retencion_valor")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", previousStart)
      .lte("fecha_emision", previousEnd),
    // Datos agregados anuales - ventas
    supabase
      .from("ventas")
      .select("subtotal_0, subtotal_5, subtotal_8, subtotal_15, iva, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", currentStart)
      .lte("fecha_emision", currentEnd),
    // Datos agregados anuales - compras
    supabase
      .from("compras")
      .select("subtotal_0, subtotal_5, subtotal_8, subtotal_15, iva, total, rubro, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", currentStart)
      .lte("fecha_emision", currentEnd),
    // Datos mensuales - ventas
    supabase
      .from("ventas")
      .select("total, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", monthlyStart)
      .lte("fecha_emision", monthlyEnd),
    // Datos mensuales - compras
    supabase
      .from("compras")
      .select("total, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", monthlyStart)
      .lte("fecha_emision", monthlyEnd),
    // Datos mensuales - retenciones
    supabase
      .from("retenciones")
      .select("retencion_valor, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", monthlyStart)
      .lte("fecha_emision", monthlyEnd),
    // Datos mensuales - notas de crédito
    supabase
      .from("notas_credito")
      .select("total, fecha_emision")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", monthlyStart)
      .lte("fecha_emision", monthlyEnd),
    // Actividad reciente - ventas
    supabase
      .from("ventas")
      .select("id, total, fecha_emision, created_at, razon_social_cliente, ruc_cliente, numero_comprobante")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", currentStart)
      .lte("fecha_emision", currentEnd)
      .order("created_at", { ascending: false })
      .limit(5),
    // Actividad reciente - compras
    supabase
      .from("compras")
      .select("id, total, fecha_emision, created_at, razon_social_proveedor, ruc_proveedor, numero_comprobante")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_emision", currentStart)
      .lte("fecha_emision", currentEnd)
      .order("created_at", { ascending: false })
      .limit(5),
    // Tax liquidations for current period
    supabase
      .from("tax_liquidations")
      .select("id")
      .eq("contribuyente_ruc", ruc)
      .gte("fecha_inicio_cierre", currentStart)
      .lte("fecha_inicio_cierre", currentEnd)
      .limit(1),
  ]);

  // Verificar errores de las queries críticas
  if (ventasMesResult.error) throw ventasMesResult.error;
  if (comprasMesResult.error) throw comprasMesResult.error;
  if (retencionesMesResult.error) throw retencionesMesResult.error;
  if (ventasAnuales.error) throw ventasAnuales.error;
  if (comprasAnuales.error) throw comprasAnuales.error;

  // Extraer datos de los resultados
  const ventasMes = ventasMesResult.data;
  const ventasMesAnt = ventasMesAntResult.data;
  const comprasMes = comprasMesResult.data;
  const comprasMesAnt = comprasMesAntResult.data;
  const retencionesMes = retencionesMesResult.data;
  const retencionesMesAnt = retencionesMesAntResult.data;
  const ventasMensuales = ventasMensualesResult.data;
  const comprasMensuales = comprasMensualesResult.data;
  const retencionesMensuales = retencionesMensualesResult.data;
  const notasCreditoMensuales = notasCreditoMensualesResult.data;
  const recentVentas = recentVentasResult.data;
  const recentCompras = recentComprasResult.data;
  const taxLiquidations = taxLiquidationsResult.data;

  // Calcular totales
  const totalVentasMes =
    ventasMes?.reduce((sum, v) => sum + (Number(v.total) || 0), 0) || 0;
  const totalIvaVentas =
    ventasMes?.reduce((sum, v) => sum + (Number(v.iva) || 0), 0) || 0;
  const totalComprasMes =
    comprasMes?.reduce((sum, c) => sum + (Number(c.total) || 0), 0) || 0;
  const totalIvaCompras =
    comprasMes?.reduce((sum, c) => sum + (Number(c.iva) || 0), 0) || 0;
  const totalRetencionesMes =
    retencionesMes?.reduce(
      (sum, r) => sum + (Number(r.retencion_valor) || 0),
      0,
    ) || 0;

  const totalVentasMesAnt =
    ventasMesAnt?.reduce((sum, v) => sum + (Number(v.total) || 0), 0) || 0;
  const totalComprasMesAnt =
    comprasMesAnt?.reduce((sum, c) => sum + (Number(c.total) || 0), 0) || 0;
  const totalRetencionesMesAnt =
    retencionesMesAnt?.reduce(
      (sum, r) => sum + (Number(r.retencion_valor) || 0),
      0,
    ) || 0;

  // Calcular IVA a pagar (IVA cobrado - IVA pagado)
  const ivaPagar = totalIvaVentas - totalIvaCompras;

  // Agrupar por mes
  const monthlyDataMap = new Map<string, MonthlyData>();
  for (let i = 0; i < monthsWindow; i++) {
    const date = monthlyRangeStart.add(i, "month");
    const monthKey = date.format("YYYY-MM");
    monthlyDataMap.set(monthKey, {
      month: date.format("MMM YY"),
      ventas: 0,
      compras: 0,
      utilidad: 0,
      retenciones: 0,
      notasCredito: 0,
    });
  }

  ventasMensuales?.forEach((v) => {
    const monthKey = dayjs(v.fecha_emision).format("YYYY-MM");
    const entry = monthlyDataMap.get(monthKey);
    if (entry) {
      entry.ventas += Number(v.total) || 0;
    }
  });

  comprasMensuales?.forEach((c) => {
    const monthKey = dayjs(c.fecha_emision).format("YYYY-MM");
    const entry = monthlyDataMap.get(monthKey);
    if (entry) {
      entry.compras += Number(c.total) || 0;
    }
  });

  retencionesMensuales?.forEach((r) => {
    const monthKey = dayjs(r.fecha_emision).format("YYYY-MM");
    const entry = monthlyDataMap.get(monthKey);
    if (entry) {
      entry.retenciones += Number(r.retencion_valor) || 0;
    }
  });

  notasCreditoMensuales?.forEach((n) => {
    const monthKey = dayjs(n.fecha_emision).format("YYYY-MM");
    const entry = monthlyDataMap.get(monthKey);
    if (entry) {
      entry.notasCredito += Number(n.total) || 0;
    }
  });

  const monthlyData = Array.from(monthlyDataMap.values()).map((d) => ({
    ...d,
    utilidad: d.ventas - d.compras,
  }));

  // Agregar datos diarios para el hero chart
  const dailyDataMap = new Map<string, DailyData>();

  // Usar datos del periodo actual (ventas y compras ya fetcheadas)
  ventasMes?.forEach((v) => {
    const dayKey = dayjs(v.fecha_emision).format("YYYY-MM-DD");
    const entry = dailyDataMap.get(dayKey) ?? { date: dayKey, ventas: 0, compras: 0 };
    entry.ventas += Number(v.total) || 0;
    dailyDataMap.set(dayKey, entry);
  });

  comprasMes?.forEach((c) => {
    const dayKey = dayjs(c.fecha_emision).format("YYYY-MM-DD");
    const entry = dailyDataMap.get(dayKey) ?? { date: dayKey, ventas: 0, compras: 0 };
    entry.compras += Number(c.total) || 0;
    dailyDataMap.set(dayKey, entry);
  });

  const dailyData = Array.from(dailyDataMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Actividad reciente
  const recentActivity: RecentActivity[] = [];

  recentVentas?.forEach((v) => {
    recentActivity.push({
      type: "Venta",
      amount: Number(v.total) || 0,
      timestamp: v.created_at,
      id: v.id,
      counterpartyName: v.razon_social_cliente ?? "Cliente no especificado",
      counterpartyRuc: v.ruc_cliente ?? "",
      comprobante: v.numero_comprobante ?? "",
    });
  });

  recentCompras?.forEach((c) => {
    recentActivity.push({
      type: "Compra",
      amount: Number(c.total) || 0,
      timestamp: c.created_at,
      id: c.id,
      counterpartyName: c.razon_social_proveedor ?? "Proveedor no especificado",
      counterpartyRuc: c.ruc_proveedor ?? "",
      comprobante: c.numero_comprobante ?? "",
    });
  });

  recentActivity.sort(
    (a, b) =>
      dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf(),
  );

  // Distribución de compras por rubro
  const rubroTotals = new Map<string, number>();
  comprasAnuales.data?.forEach((compra) => {
    const rubro = compra.rubro ?? "no_definido";
    const current = rubroTotals.get(rubro) || 0;
    rubroTotals.set(rubro, current + (Number(compra.total) || 0));
  });

  const rubroDistribution = Array.from(rubroTotals.entries())
    .map(([rubro, total]) => ({ rubro, total }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Desglose de bases imponibles por tasa
  const ventasRates = ventasAnuales.data?.reduce(
    (acc, venta) => {
      acc["0"] += Number(venta.subtotal_0) || 0;
      acc["5"] += Number(venta.subtotal_5) || 0;
      acc["8"] += Number(venta.subtotal_8) || 0;
      acc["15"] += Number(venta.subtotal_15) || 0;
      acc["iva"] += Number(venta.iva) || 0;
      return acc;
    },
    { "0": 0, "5": 0, "8": 0, "15": 0, iva: 0 },
  ) ?? { "0": 0, "5": 0, "8": 0, "15": 0, iva: 0 };

  const comprasRates = comprasAnuales.data?.reduce(
    (acc, compra) => {
      acc["0"] += Number(compra.subtotal_0) || 0;
      acc["5"] += Number(compra.subtotal_5) || 0;
      acc["8"] += Number(compra.subtotal_8) || 0;
      acc["15"] += Number(compra.subtotal_15) || 0;
      acc["iva"] += Number(compra.iva) || 0;
      return acc;
    },
    { "0": 0, "5": 0, "8": 0, "15": 0, iva: 0 },
  ) ?? { "0": 0, "5": 0, "8": 0, "15": 0, iva: 0 };

  const ivaBreakdown: IvaBreakdownItem[] = [
    { rate: "Base 0%", ventas: ventasRates["0"], compras: comprasRates["0"] },
    { rate: "Base 5%", ventas: ventasRates["5"], compras: comprasRates["5"] },
    { rate: "Base 8%", ventas: ventasRates["8"], compras: comprasRates["8"] },
    { rate: "Base 15%", ventas: ventasRates["15"], compras: comprasRates["15"] },
    { rate: "IVA", ventas: ventasRates["iva"], compras: comprasRates["iva"] },
  ];

  // Estado tributario
  const hasTransactions = (ventasMes?.length ?? 0) > 0 || (comprasMes?.length ?? 0) > 0;
  const taxStatus: TaxStatus = {
    hasCurrentLiquidation: (taxLiquidations?.length ?? 0) > 0,
    hasTransactions,
    documentCounts: {
      ventas: ventasMes?.length ?? 0,
      compras: comprasMes?.length ?? 0,
      retenciones: retencionesMes?.length ?? 0,
    },
  };

  return {
    kpis: {
      ventasMes: totalVentasMes,
      comprasMes: totalComprasMes,
      ivaPagar: Math.max(0, ivaPagar),
      ivaVentas: totalIvaVentas,
      ivaCompras: totalIvaCompras,
      retencionesMes: totalRetencionesMes,
      ventasMesAnterior: totalVentasMesAnt,
      comprasMesAnterior: totalComprasMesAnt,
      retencionesMesAnterior: totalRetencionesMesAnt,
    },
    monthlyData,
    dailyData,
    rubroDistribution,
    ivaBreakdown,
    recentActivity: recentActivity.slice(0, 6),
    taxStatus,
  };
}

const emptyKpis: DashboardKPIs = {
  ventasMes: 0,
  comprasMes: 0,
  ivaPagar: 0,
  ivaVentas: 0,
  ivaCompras: 0,
  retencionesMes: 0,
  ventasMesAnterior: 0,
  comprasMesAnterior: 0,
  retencionesMesAnterior: 0,
};

export function useDashboardData(): DashboardData {
  // Usar contribuyenteEfectivo para soportar tanto contribuyentes como contadores
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();

  const ruc = contribuyente?.ruc ?? null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", ruc, selectedYear, selectedMonth],
    queryFn: () => fetchDashboardData(ruc!, selectedYear, selectedMonth),
    enabled: !!ruc,
  });

  return {
    kpis: data?.kpis ?? emptyKpis,
    monthlyData: data?.monthlyData ?? [],
    dailyData: data?.dailyData ?? [],
    rubroDistribution: data?.rubroDistribution ?? [],
    ivaBreakdown: data?.ivaBreakdown ?? [],
    recentActivity: data?.recentActivity ?? [],
    taxStatus: data?.taxStatus ?? { hasCurrentLiquidation: false, hasTransactions: false, documentCounts: { ventas: 0, compras: 0, retenciones: 0 } },
    loading: isLoading,
    error: error ? "Error al cargar los datos del dashboard" : null,
  };
}
