"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";

import { supabase, type Venta, type TipoComprobante } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useDebounce } from "@/hooks/use-debounce";

export interface VentasTableFilters {
  busqueda: string;
  tipoComprobante: TipoComprobante | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
}

const ITEMS_POR_PAGINA = 15;

const initialFilters: VentasTableFilters = {
  busqueda: "",
  tipoComprobante: null,
  fechaDesde: null,
  fechaHasta: null,
};

export interface VentasTotals {
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
}

interface FetchVentasResult {
  ventas: Venta[];
  totalCount: number;
  totals: VentasTotals;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q extends { eq: any; gte: any; lte: any; or: any }>(
  query: Q,
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: VentasTableFilters,
  debouncedBusqueda: string,
): Q {
  let q = query
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd) as Q;

  if (filters.tipoComprobante) {
    q = q.eq("tipo_comprobante", filters.tipoComprobante) as Q;
  }
  if (debouncedBusqueda) {
    const term = `%${debouncedBusqueda}%`;
    q = q.or(
      `razon_social_cliente.ilike.${term},ruc_cliente.ilike.${term}`
    ) as Q;
  }
  if (filters.fechaDesde) {
    q = q.gte("fecha_emision", filters.fechaDesde) as Q;
  }
  if (filters.fechaHasta) {
    q = q.lte("fecha_emision", filters.fechaHasta) as Q;
  }
  return q;
}

const ZERO_TOTALS: VentasTotals = {
  subtotal_0: 0, subtotal_5: 0, subtotal_8: 0, subtotal_15: 0, iva: 0, total: 0,
};

async function fetchVentasPage(
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: VentasTableFilters,
  debouncedBusqueda: string,
  page: number,
): Promise<FetchVentasResult> {
  const from = (page - 1) * ITEMS_POR_PAGINA;
  const to = from + ITEMS_POR_PAGINA - 1;

  const paginatedQuery = applyFilters(
    supabase.from("ventas").select("*", { count: "exact" }),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  )
    .order("fecha_emision", { ascending: false })
    .range(from, to);

  const sumsQuery = applyFilters(
    supabase.from("ventas").select("subtotal_0, subtotal_5, subtotal_8, subtotal_15, iva, total"),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  );

  const [pageResult, sumsResult] = await Promise.all([paginatedQuery, sumsQuery]);

  if (pageResult.error) throw pageResult.error;
  if (sumsResult.error) throw sumsResult.error;

  const rows = (sumsResult.data ?? []) as Pick<Venta, "subtotal_0" | "subtotal_5" | "subtotal_8" | "subtotal_15" | "iva" | "total">[];
  const totals = rows.reduce<VentasTotals>((acc, row) => ({
    subtotal_0: acc.subtotal_0 + (row.subtotal_0 ?? 0),
    subtotal_5: acc.subtotal_5 + (row.subtotal_5 ?? 0),
    subtotal_8: acc.subtotal_8 + (row.subtotal_8 ?? 0),
    subtotal_15: acc.subtotal_15 + (row.subtotal_15 ?? 0),
    iva: acc.iva + (row.iva ?? 0),
    total: acc.total + (row.total ?? 0),
  }), { ...ZERO_TOTALS });

  return {
    ventas: (pageResult.data as Venta[]) ?? [],
    totalCount: pageResult.count ?? 0,
    totals,
  };
}

export function useVentasTable() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const queryClient = useQueryClient();

  const ruc = contribuyente?.ruc ?? null;

  const [filters, setFilters] = useState<VentasTableFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const debouncedBusqueda = useDebounce(filters.busqueda, 300);

  const periodStart = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).startOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).startOf("year").format("YYYY-MM-DD");

  const periodEnd = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).endOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).endOf("year").format("YYYY-MM-DD");

  const queryKey = [
    "ventas-table",
    ruc,
    periodStart,
    periodEnd,
    debouncedBusqueda,
    filters.tipoComprobante,
    filters.fechaDesde,
    filters.fechaHasta,
    page,
  ];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchVentasPage(ruc!, periodStart, periodEnd, filters, debouncedBusqueda, page),
    enabled: !!ruc,
    placeholderData: keepPreviousData,
  });

  const updateFilter = useCallback(
    <K extends keyof VentasTableFilters>(key: K, value: VentasTableFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setPage(1);
  }, []);

  const activeFilterCount = [
    filters.busqueda !== "",
    filters.tipoComprobante !== null,
    filters.fechaDesde !== null,
    filters.fechaHasta !== null,
  ].filter(Boolean).length;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["ventas-table", ruc] });
  }, [queryClient, ruc]);

  return {
    ventas: data?.ventas ?? [],
    totalCount: data?.totalCount ?? 0,
    totals: data?.totals ?? ZERO_TOTALS,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    activeFilterCount,
    isLoading,
    isFetching,
    invalidate,
    itemsPerPage: ITEMS_POR_PAGINA,
  };
}
