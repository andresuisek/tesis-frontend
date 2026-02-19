"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";

import { supabase, type Compra, type RubroCompra, type TipoComprobante } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useDebounce } from "@/hooks/use-debounce";

export interface ComprasTableFilters {
  busqueda: string;
  rubro: RubroCompra | null;
  tipoComprobante: TipoComprobante | null;
  fechaDesde: string | null; // YYYY-MM-DD
  fechaHasta: string | null; // YYYY-MM-DD
}

const ITEMS_POR_PAGINA = 15;

const initialFilters: ComprasTableFilters = {
  busqueda: "",
  rubro: null,
  tipoComprobante: null,
  fechaDesde: null,
  fechaHasta: null,
};

export interface ComprasTotals {
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
}

interface FetchComprasResult {
  compras: Compra[];
  totalCount: number;
  totals: ComprasTotals;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q extends { eq: any; gte: any; lte: any; or: any }>(
  query: Q,
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: ComprasTableFilters,
  debouncedBusqueda: string,
): Q {
  let q = query
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd) as Q;

  if (filters.rubro) {
    q = q.eq("rubro", filters.rubro) as Q;
  }
  if (filters.tipoComprobante) {
    q = q.eq("tipo_comprobante", filters.tipoComprobante) as Q;
  }
  if (debouncedBusqueda) {
    const term = `%${debouncedBusqueda}%`;
    q = q.or(
      `razon_social_proveedor.ilike.${term},ruc_proveedor.ilike.${term}`
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

const ZERO_TOTALS: ComprasTotals = {
  subtotal_0: 0, subtotal_5: 0, subtotal_8: 0, subtotal_15: 0, iva: 0, total: 0,
};

async function fetchComprasPage(
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: ComprasTableFilters,
  debouncedBusqueda: string,
  page: number,
): Promise<FetchComprasResult> {
  const from = (page - 1) * ITEMS_POR_PAGINA;
  const to = from + ITEMS_POR_PAGINA - 1;

  // Paginated query for table rows
  const paginatedQuery = applyFilters(
    supabase.from("compras").select("*", { count: "exact" }),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  )
    .order("fecha_emision", { ascending: false })
    .range(from, to);

  // Sums query — only numeric columns, no pagination
  const sumsQuery = applyFilters(
    supabase.from("compras").select("subtotal_0, subtotal_5, subtotal_8, subtotal_15, iva, total"),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  );

  const [pageResult, sumsResult] = await Promise.all([paginatedQuery, sumsQuery]);

  if (pageResult.error) throw pageResult.error;
  if (sumsResult.error) throw sumsResult.error;

  const rows = (sumsResult.data ?? []) as Pick<Compra, "subtotal_0" | "subtotal_5" | "subtotal_8" | "subtotal_15" | "iva" | "total">[];
  const totals = rows.reduce<ComprasTotals>((acc, row) => ({
    subtotal_0: acc.subtotal_0 + (row.subtotal_0 ?? 0),
    subtotal_5: acc.subtotal_5 + (row.subtotal_5 ?? 0),
    subtotal_8: acc.subtotal_8 + (row.subtotal_8 ?? 0),
    subtotal_15: acc.subtotal_15 + (row.subtotal_15 ?? 0),
    iva: acc.iva + (row.iva ?? 0),
    total: acc.total + (row.total ?? 0),
  }), { ...ZERO_TOTALS });

  return {
    compras: (pageResult.data as Compra[]) ?? [],
    totalCount: pageResult.count ?? 0,
    totals,
  };
}

export function useComprasTable() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const queryClient = useQueryClient();

  const ruc = contribuyente?.ruc ?? null;

  const [filters, setFilters] = useState<ComprasTableFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const debouncedBusqueda = useDebounce(filters.busqueda, 300);

  // Compute period bounds from date filter context
  const periodStart = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).startOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).startOf("year").format("YYYY-MM-DD");

  const periodEnd = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).endOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).endOf("year").format("YYYY-MM-DD");

  const queryKey = [
    "compras-table",
    ruc,
    periodStart,
    periodEnd,
    debouncedBusqueda,
    filters.rubro,
    filters.tipoComprobante,
    filters.fechaDesde,
    filters.fechaHasta,
    page,
  ];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchComprasPage(ruc!, periodStart, periodEnd, filters, debouncedBusqueda, page),
    enabled: !!ruc,
    placeholderData: keepPreviousData,
  });

  const updateFilter = useCallback(
    <K extends keyof ComprasTableFilters>(key: K, value: ComprasTableFilters[K]) => {
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
    filters.rubro !== null,
    filters.tipoComprobante !== null,
    filters.fechaDesde !== null,
    filters.fechaHasta !== null,
  ].filter(Boolean).length;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["compras-table", ruc] });
  }, [queryClient, ruc]);

  // Reset page when period changes
  // We can't use useEffect for this cleanly since period is derived,
  // but React Query will automatically refetch when queryKey changes.
  // The page reset on period change is handled in page.tsx via useEffect.

  return {
    compras: data?.compras ?? [],
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
