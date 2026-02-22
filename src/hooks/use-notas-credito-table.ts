"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";

import { supabase, type NotaCredito } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useDebounce } from "@/hooks/use-debounce";

export interface NotasCreditoTableFilters {
  busqueda: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
}

const ITEMS_POR_PAGINA = 15;

const initialFilters: NotasCreditoTableFilters = {
  busqueda: "",
  fechaDesde: null,
  fechaHasta: null,
};

export interface NotasCreditoTotals {
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
}

interface FetchNotasCreditoResult {
  notasCredito: NotaCredito[];
  totalCount: number;
  totals: NotasCreditoTotals;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q extends { eq: any; gte: any; lte: any; ilike: any }>(
  query: Q,
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: NotasCreditoTableFilters,
  debouncedBusqueda: string,
): Q {
  let q = query
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd) as Q;

  if (debouncedBusqueda) {
    const term = `%${debouncedBusqueda}%`;
    q = q.ilike("numero_comprobante", term) as Q;
  }
  if (filters.fechaDesde) {
    q = q.gte("fecha_emision", filters.fechaDesde) as Q;
  }
  if (filters.fechaHasta) {
    q = q.lte("fecha_emision", filters.fechaHasta) as Q;
  }
  return q;
}

const ZERO_TOTALS: NotasCreditoTotals = {
  subtotal_0: 0, subtotal_5: 0, subtotal_8: 0, subtotal_15: 0, iva: 0, total: 0,
};

async function fetchNotasCreditoPage(
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: NotasCreditoTableFilters,
  debouncedBusqueda: string,
  page: number,
): Promise<FetchNotasCreditoResult> {
  const from = (page - 1) * ITEMS_POR_PAGINA;
  const to = from + ITEMS_POR_PAGINA - 1;

  const paginatedQuery = applyFilters(
    supabase.from("notas_credito").select("*", { count: "exact" }),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  )
    .order("fecha_emision", { ascending: false })
    .range(from, to);

  const sumsQuery = applyFilters(
    supabase.from("notas_credito").select("subtotal_0, subtotal_5, subtotal_8, subtotal_15, iva, total"),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  );

  const [pageResult, sumsResult] = await Promise.all([paginatedQuery, sumsQuery]);

  if (pageResult.error) throw pageResult.error;
  if (sumsResult.error) throw sumsResult.error;

  const rows = (sumsResult.data ?? []) as Pick<NotaCredito, "subtotal_0" | "subtotal_5" | "subtotal_8" | "subtotal_15" | "iva" | "total">[];
  const totals = rows.reduce<NotasCreditoTotals>((acc, row) => ({
    subtotal_0: acc.subtotal_0 + (row.subtotal_0 ?? 0),
    subtotal_5: acc.subtotal_5 + (row.subtotal_5 ?? 0),
    subtotal_8: acc.subtotal_8 + (row.subtotal_8 ?? 0),
    subtotal_15: acc.subtotal_15 + (row.subtotal_15 ?? 0),
    iva: acc.iva + (row.iva ?? 0),
    total: acc.total + (row.total ?? 0),
  }), { ...ZERO_TOTALS });

  return {
    notasCredito: (pageResult.data as NotaCredito[]) ?? [],
    totalCount: pageResult.count ?? 0,
    totals,
  };
}

export function useNotasCreditoTable() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const queryClient = useQueryClient();

  const ruc = contribuyente?.ruc ?? null;

  const [filters, setFilters] = useState<NotasCreditoTableFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const debouncedBusqueda = useDebounce(filters.busqueda, 300);

  const periodStart = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).startOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).startOf("year").format("YYYY-MM-DD");

  const periodEnd = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).endOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).endOf("year").format("YYYY-MM-DD");

  const queryKey = [
    "notas-credito-table",
    ruc,
    periodStart,
    periodEnd,
    debouncedBusqueda,
    filters.fechaDesde,
    filters.fechaHasta,
    page,
  ];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchNotasCreditoPage(ruc!, periodStart, periodEnd, filters, debouncedBusqueda, page),
    enabled: !!ruc,
    placeholderData: keepPreviousData,
  });

  const updateFilter = useCallback(
    <K extends keyof NotasCreditoTableFilters>(key: K, value: NotasCreditoTableFilters[K]) => {
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
    filters.fechaDesde !== null,
    filters.fechaHasta !== null,
  ].filter(Boolean).length;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["notas-credito-table", ruc] });
  }, [queryClient, ruc]);

  return {
    notasCredito: data?.notasCredito ?? [],
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
