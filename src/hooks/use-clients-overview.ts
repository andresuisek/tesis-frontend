"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, ContadorContribuyenteConDetalle } from "@/lib/supabase";
import {
  getNextDeadline,
  getDeadlineStatus,
  groupClientsByDeadline,
  type TaxDeadlineInfo,
  type DeadlineStatus,
  type DeadlineGroup,
} from "@/lib/tax-deadlines";
import dayjs from "dayjs";

// ─── Types ───────────────────────────────────────────────────────────

export interface ClientFinancialSummary {
  totalVentas: number;
  totalCompras: number;
  transactionCount: number;
}

export interface ClientOverviewData {
  ruc: string;
  firstName: string;
  lastName: string;
  email?: string;
  telefono?: string;
  estado: string;
  tipoObligacion: "mensual" | "semestral" | "anual";
  tipoRegimen: string;
  deadlineInfo: TaxDeadlineInfo;
  deadlineStatus: DeadlineStatus;
  financial: ClientFinancialSummary;
  fechaAsignacion: string;
  relacionId: string;
  isActive: boolean;
}

export interface StatusSummary {
  total: number;
  cumplido: number;
  por_vencer: number;
  vencido: number;
  sin_actividad: number;
}

export interface ClientsOverviewResult {
  clients: ClientOverviewData[];
  deadlineGroups: DeadlineGroup[];
  statusSummary: StatusSummary;
  loading: boolean;
  error: string | null;
}

// ─── Fetch function ──────────────────────────────────────────────────

interface BatchData {
  ventasByRuc: Map<string, { total: number; count: number }>;
  comprasByRuc: Map<string, { total: number; count: number }>;
  liquidationsByRuc: Set<string>;
}

async function fetchBatchData(allRucs: string[], periodStart: string, periodEnd: string): Promise<BatchData> {
  const [ventasResult, comprasResult, liquidationsResult] = await Promise.all([
    supabase
      .from("ventas")
      .select("contribuyente_ruc, total")
      .in("contribuyente_ruc", allRucs)
      .gte("fecha_emision", periodStart)
      .lte("fecha_emision", periodEnd),
    supabase
      .from("compras")
      .select("contribuyente_ruc, total")
      .in("contribuyente_ruc", allRucs)
      .gte("fecha_emision", periodStart)
      .lte("fecha_emision", periodEnd),
    supabase
      .from("tax_liquidations")
      .select("contribuyente_ruc")
      .in("contribuyente_ruc", allRucs)
      .gte("fecha_inicio_cierre", periodStart)
      .lte("fecha_fin_cierre", periodEnd)
      .is("deleted_at", null),
  ]);

  // Group ventas by RUC
  const ventasByRuc = new Map<string, { total: number; count: number }>();
  if (ventasResult.data) {
    for (const v of ventasResult.data) {
      const existing = ventasByRuc.get(v.contribuyente_ruc) ?? { total: 0, count: 0 };
      existing.total += Number(v.total) || 0;
      existing.count += 1;
      ventasByRuc.set(v.contribuyente_ruc, existing);
    }
  }

  // Group compras by RUC
  const comprasByRuc = new Map<string, { total: number; count: number }>();
  if (comprasResult.data) {
    for (const c of comprasResult.data) {
      const existing = comprasByRuc.get(c.contribuyente_ruc) ?? { total: 0, count: 0 };
      existing.total += Number(c.total) || 0;
      existing.count += 1;
      comprasByRuc.set(c.contribuyente_ruc, existing);
    }
  }

  // Liquidations as a set of RUCs that have one
  const liquidationsByRuc = new Set<string>();
  if (liquidationsResult.data) {
    for (const l of liquidationsResult.data) {
      liquidationsByRuc.add(l.contribuyente_ruc);
    }
  }

  return { ventasByRuc, comprasByRuc, liquidationsByRuc };
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useClientsOverview(
  contribuyentesAsignados: ContadorContribuyenteConDetalle[],
  contribuyenteActivoRuc: string | null,
): ClientsOverviewResult {
  const allRucs = useMemo(
    () => contribuyentesAsignados.map((a) => a.contribuyente_ruc).filter(Boolean),
    [contribuyentesAsignados],
  );

  // Use the broadest period range that covers all obligation types.
  // For monthly: previous month. For semestral/anual: up to a year back.
  // We use a 12-month window ending today for simplicity.
  const periodStart = useMemo(() => dayjs().subtract(12, "month").startOf("month").format("YYYY-MM-DD"), []);
  const periodEnd = useMemo(() => dayjs().endOf("month").format("YYYY-MM-DD"), []);

  const { data: batchData, isLoading, error } = useQuery({
    queryKey: ["clients-overview", allRucs.join(","), periodStart, periodEnd],
    queryFn: () => fetchBatchData(allRucs, periodStart, periodEnd),
    enabled: allRucs.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const result = useMemo(() => {
    if (!batchData || allRucs.length === 0) {
      return {
        clients: [],
        deadlineGroups: [],
        statusSummary: { total: 0, cumplido: 0, por_vencer: 0, vencido: 0, sin_actividad: 0 },
      };
    }

    const clients: ClientOverviewData[] = [];

    for (const asignado of contribuyentesAsignados) {
      const c = asignado.contribuyente;
      if (!c) continue;

      const tipoObligacion = c.tipo_obligacion ?? "mensual";
      const deadlineInfo = getNextDeadline(c.ruc, tipoObligacion);

      const ventas = batchData.ventasByRuc.get(c.ruc) ?? { total: 0, count: 0 };
      const compras = batchData.comprasByRuc.get(c.ruc) ?? { total: 0, count: 0 };
      const hasLiquidation = batchData.liquidationsByRuc.has(c.ruc);
      const hasTransactions = ventas.count > 0 || compras.count > 0;

      const { status, urgencyLevel } = getDeadlineStatus(
        deadlineInfo.daysUntilDeadline,
        hasLiquidation,
        hasTransactions,
      );

      deadlineInfo.status = status;
      deadlineInfo.urgencyLevel = urgencyLevel;

      clients.push({
        ruc: c.ruc,
        firstName: c.first_name ?? "",
        lastName: c.last_name ?? "",
        email: c.email,
        telefono: c.telefono,
        estado: c.estado,
        tipoObligacion,
        tipoRegimen: c.tipo_regimen ?? "general",
        deadlineInfo,
        deadlineStatus: status,
        financial: {
          totalVentas: ventas.total,
          totalCompras: compras.total,
          transactionCount: ventas.count + compras.count,
        },
        fechaAsignacion: asignado.fecha_asignacion,
        relacionId: asignado.id,
        isActive: c.ruc === contribuyenteActivoRuc,
      });
    }

    const deadlineGroups = groupClientsByDeadline(
      clients.map((cl) => ({
        ruc: cl.ruc,
        name: `${cl.firstName} ${cl.lastName}`,
        deadlineInfo: cl.deadlineInfo,
        status: cl.deadlineStatus,
      })),
    );

    const statusSummary: StatusSummary = {
      total: clients.length,
      cumplido: clients.filter((c) => c.deadlineStatus === "cumplido").length,
      por_vencer: clients.filter((c) => c.deadlineStatus === "por_vencer").length,
      vencido: clients.filter((c) => c.deadlineStatus === "vencido").length,
      sin_actividad: clients.filter((c) => c.deadlineStatus === "sin_actividad").length,
    };

    return { clients, deadlineGroups, statusSummary };
  }, [batchData, contribuyentesAsignados, allRucs, contribuyenteActivoRuc]);

  return {
    ...result,
    loading: isLoading,
    error: error ? "Error al cargar resumen de clientes" : null,
  };
}
