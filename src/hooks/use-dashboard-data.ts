"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useDateFilter } from "@/contexts/date-filter-context";
import dayjs from "dayjs";

export interface DashboardKPIs {
  ventasMes: number;
  comprasMes: number;
  ivaPagar: number;
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

export interface TaxDistribution {
  name: string;
  value: number;
}

export interface RecentActivity {
  type: string;
  amount: number;
  timestamp: string;
  status: string;
  id: string;
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
  taxDistribution: TaxDistribution[];
  rubroDistribution: RubroDistribution[];
  ivaBreakdown: IvaBreakdownItem[];
  recentActivity: RecentActivity[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  // Usar contribuyenteEfectivo para soportar tanto contribuyentes como contadores
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const [data, setData] = useState<DashboardData>({
    kpis: {
      ventasMes: 0,
      comprasMes: 0,
      ivaPagar: 0,
      retencionesMes: 0,
      ventasMesAnterior: 0,
      comprasMesAnterior: 0,
      retencionesMesAnterior: 0,
    },
    monthlyData: [],
    taxDistribution: [],
    rubroDistribution: [],
    ivaBreakdown: [],
    recentActivity: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!contribuyente?.ruc) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Capturar el RUC en una constante para evitar problemas de nullability
    const rucContribuyente = contribuyente.ruc;

    async function fetchDashboardData() {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

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

        const monthsWindow = selectedMonth !== null ? 6 : 12;
        const monthlyRangeStart =
          selectedMonth !== null
            ? currentPeriodStart.subtract(monthsWindow - 1, "month")
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

        // Obtener ventas del mes actual
        const { data: ventasMes, error: ventasError } = await supabase
          .from("ventas")
          .select("total, iva, fecha_emision")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", currentStart)
          .lte("fecha_emision", currentEnd);

        if (ventasError) throw ventasError;

        // Obtener ventas del mes anterior
        const { data: ventasMesAnt } = await supabase
          .from("ventas")
          .select("total")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", previousStart)
          .lte("fecha_emision", previousEnd);

        // Obtener compras del mes actual
        const { data: comprasMes, error: comprasError } = await supabase
          .from("compras")
          .select("total, iva, fecha_emision")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", currentStart)
          .lte("fecha_emision", currentEnd);

        if (comprasError) throw comprasError;

        // Obtener compras del mes anterior
        const { data: comprasMesAnt } = await supabase
          .from("compras")
          .select("total")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", previousStart)
          .lte("fecha_emision", previousEnd);

        // Obtener retenciones del mes actual
        const { data: retencionesMes, error: retencionesError } =
          await supabase
            .from("retenciones")
            .select("retencion_valor, fecha_emision")
            .eq("contribuyente_ruc", rucContribuyente)
            .gte("fecha_emision", currentStart)
            .lte("fecha_emision", currentEnd);

        if (retencionesError) throw retencionesError;

        // Obtener retenciones del mes anterior
        const { data: retencionesMesAnt } = await supabase
          .from("retenciones")
          .select("retencion_valor")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", previousStart)
          .lte("fecha_emision", previousEnd);

        // Datos agregados anuales para análisis
        const [ventasAnuales, comprasAnuales] = await Promise.all([
          supabase
            .from("ventas")
            .select("subtotal_0, subtotal_8, subtotal_15, iva, fecha_emision")
            .eq("contribuyente_ruc", rucContribuyente)
            .gte("fecha_emision", currentStart)
            .lte("fecha_emision", currentEnd),
          supabase
            .from("compras")
            .select("subtotal_0, subtotal_8, subtotal_15, iva, total, rubro, fecha_emision")
            .eq("contribuyente_ruc", rucContribuyente)
            .gte("fecha_emision", currentStart)
            .lte("fecha_emision", currentEnd),
        ]);

        if (ventasAnuales.error) throw ventasAnuales.error;
        if (comprasAnuales.error) throw comprasAnuales.error;

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
            0
          ) || 0;

        const totalVentasMesAnt =
          ventasMesAnt?.reduce((sum, v) => sum + (Number(v.total) || 0), 0) ||
          0;
        const totalComprasMesAnt =
          comprasMesAnt?.reduce((sum, c) => sum + (Number(c.total) || 0), 0) ||
          0;
        const totalRetencionesMesAnt =
          retencionesMesAnt?.reduce(
            (sum, r) => sum + (Number(r.retencion_valor) || 0),
            0
          ) || 0;

        // Calcular IVA a pagar (IVA cobrado - IVA pagado)
        const ivaPagar = totalIvaVentas - totalIvaCompras;

        // Obtener datos mensuales (últimos 6 meses)
        const { data: ventasMensuales } = await supabase
          .from("ventas")
          .select("total, fecha_emision")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", monthlyStart)
          .lte("fecha_emision", monthlyEnd);

        const { data: comprasMensuales } = await supabase
          .from("compras")
          .select("total, fecha_emision")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", monthlyStart)
          .lte("fecha_emision", monthlyEnd);

        const { data: retencionesMensuales } = await supabase
          .from("retenciones")
          .select("retencion_valor, fecha_emision")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", monthlyStart)
          .lte("fecha_emision", monthlyEnd);

        const { data: notasCreditoMensuales } = await supabase
          .from("notas_credito")
          .select("total, fecha_emision")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", monthlyStart)
          .lte("fecha_emision", monthlyEnd);

        // Agrupar por mes
        const monthlyDataMap = new Map<string, MonthlyData>();
        for (let i = 0; i < monthsWindow; i++) {
          const date = monthlyRangeStart.add(i, "month");
          const monthKey = date.format("YYYY-MM");
          monthlyDataMap.set(monthKey, {
            month: date.format("MMM"),
            ventas: 0,
            compras: 0,
            utilidad: 0,
            retenciones: 0,
            notasCredito: 0,
          });
        }

        ventasMensuales?.forEach((v) => {
          const monthKey = dayjs(v.fecha_emision).format("YYYY-MM");
          const data = monthlyDataMap.get(monthKey);
          if (data) {
            data.ventas += Number(v.total) || 0;
          }
        });

        comprasMensuales?.forEach((c) => {
          const monthKey = dayjs(c.fecha_emision).format("YYYY-MM");
          const data = monthlyDataMap.get(monthKey);
          if (data) {
            data.compras += Number(c.total) || 0;
          }
        });

        retencionesMensuales?.forEach((r) => {
          const monthKey = dayjs(r.fecha_emision).format("YYYY-MM");
          const data = monthlyDataMap.get(monthKey);
          if (data) {
            data.retenciones += Number(r.retencion_valor) || 0;
          }
        });

        notasCreditoMensuales?.forEach((n) => {
          const monthKey = dayjs(n.fecha_emision).format("YYYY-MM");
          const data = monthlyDataMap.get(monthKey);
          if (data) {
            data.notasCredito += Number(n.total) || 0;
          }
        });

        const monthlyData = Array.from(monthlyDataMap.values()).map((d) => ({
          ...d,
          utilidad: d.ventas - d.compras,
        }));

        // Actividad reciente (últimas 10 transacciones)
        const { data: recentVentas } = await supabase
          .from("ventas")
          .select("id, total, fecha_emision, created_at")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", currentStart)
          .lte("fecha_emision", currentEnd)
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: recentCompras } = await supabase
          .from("compras")
          .select("id, total, fecha_emision, created_at")
          .eq("contribuyente_ruc", rucContribuyente)
          .gte("fecha_emision", currentStart)
          .lte("fecha_emision", currentEnd)
          .order("created_at", { ascending: false })
          .limit(5);

        const recentActivity: RecentActivity[] = [];

        recentVentas?.forEach((v) => {
          recentActivity.push({
            type: "Venta",
            amount: Number(v.total) || 0,
            timestamp: v.created_at,
            status: "Completado",
            id: v.id,
          });
        });

        recentCompras?.forEach((c) => {
          recentActivity.push({
            type: "Compra",
            amount: Number(c.total) || 0,
            timestamp: c.created_at,
            status: "Completado",
            id: c.id,
          });
        });

        recentActivity.sort(
          (a, b) =>
            dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf()
        );

        // Distribución de compras por rubro (año actual)
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
            acc["8"] += Number(venta.subtotal_8) || 0;
            acc["15"] += Number(venta.subtotal_15) || 0;
            acc["iva"] += Number(venta.iva) || 0;
            return acc;
          },
          { "0": 0, "8": 0, "15": 0, iva: 0 }
        ) ?? { "0": 0, "8": 0, "15": 0, iva: 0 };

        const comprasRates = comprasAnuales.data?.reduce(
          (acc, compra) => {
            acc["0"] += Number(compra.subtotal_0) || 0;
            acc["8"] += Number(compra.subtotal_8) || 0;
            acc["15"] += Number(compra.subtotal_15) || 0;
            acc["iva"] += Number(compra.iva) || 0;
            return acc;
          },
          { "0": 0, "8": 0, "15": 0, iva: 0 }
        ) ?? { "0": 0, "8": 0, "15": 0, iva: 0 };

        const ivaBreakdown: IvaBreakdownItem[] = [
          {
            rate: "Base 0%",
            ventas: ventasRates["0"],
            compras: comprasRates["0"],
          },
          {
            rate: "Base 8%",
            ventas: ventasRates["8"],
            compras: comprasRates["8"],
          },
          {
            rate: "Base 15%",
            ventas: ventasRates["15"],
            compras: comprasRates["15"],
          },
          {
            rate: "IVA",
            ventas: ventasRates["iva"],
            compras: comprasRates["iva"],
          },
        ];

        // Distribución de impuestos
        const taxDistribution: TaxDistribution[] = [
          { name: "IVA Cobrado", value: totalIvaVentas },
          { name: "IVA Pagado", value: totalIvaCompras },
          { name: "Retenciones", value: totalRetencionesMes },
          { name: "IVA a Pagar", value: Math.max(0, ivaPagar) },
        ];

        setData({
          kpis: {
            ventasMes: totalVentasMes,
            comprasMes: totalComprasMes,
            ivaPagar: Math.max(0, ivaPagar),
            retencionesMes: totalRetencionesMes,
            ventasMesAnterior: totalVentasMesAnt,
            comprasMesAnterior: totalComprasMesAnt,
            retencionesMesAnterior: totalRetencionesMesAnt,
          },
          monthlyData,
          taxDistribution: taxDistribution.filter((t) => t.value > 0),
          rubroDistribution,
          ivaBreakdown,
          recentActivity: recentActivity.slice(0, 6),
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Error al cargar los datos del dashboard",
        }));
      }
    }

    fetchDashboardData();
  }, [contribuyente?.ruc, selectedMonth, selectedYear]);

  return data;
}

