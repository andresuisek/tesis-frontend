"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";

import { supabase, type Retencion } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useDebounce } from "@/hooks/use-debounce";

export interface RetencionesTableFilters {
  busqueda: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
}

const ITEMS_POR_PAGINA = 15;

const initialFilters: RetencionesTableFilters = {
  busqueda: "",
  fechaDesde: null,
  fechaHasta: null,
};

export interface RetencionesTotals {
  retencion_valor: number;
  retencion_renta_valor: number;
  total: number;
}

interface FetchRetencionesResult {
  retenciones: Retencion[];
  totalCount: number;
  totals: RetencionesTotals;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q extends { eq: any; gte: any; lte: any; or: any }>(
  query: Q,
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: RetencionesTableFilters,
  debouncedBusqueda: string,
): Q {
  let q = query
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd) as Q;

  if (debouncedBusqueda) {
    const term = `%${debouncedBusqueda}%`;
    q = q.or(
      `serie_comprobante.ilike.${term},clave_acceso.ilike.${term}`
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

const ZERO_TOTALS: RetencionesTotals = {
  retencion_valor: 0, retencion_renta_valor: 0, total: 0,
};

async function fetchRetencionesPage(
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: RetencionesTableFilters,
  debouncedBusqueda: string,
  page: number,
): Promise<FetchRetencionesResult> {
  const from = (page - 1) * ITEMS_POR_PAGINA;
  const to = from + ITEMS_POR_PAGINA - 1;

  const paginatedQuery = applyFilters(
    supabase.from("retenciones").select("*", { count: "exact" }),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  )
    .order("fecha_emision", { ascending: false })
    .range(from, to);

  const sumsQuery = applyFilters(
    supabase.from("retenciones").select("retencion_valor, retencion_renta_valor"),
    ruc, periodStart, periodEnd, filters, debouncedBusqueda,
  );

  const [pageResult, sumsResult] = await Promise.all([paginatedQuery, sumsQuery]);

  if (pageResult.error) throw pageResult.error;
  if (sumsResult.error) throw sumsResult.error;

  const rows = (sumsResult.data ?? []) as Pick<Retencion, "retencion_valor" | "retencion_renta_valor">[];
  const totals = rows.reduce<RetencionesTotals>((acc, row) => {
    const ivaVal = row.retencion_valor ?? 0;
    const rentaVal = row.retencion_renta_valor ?? 0;
    return {
      retencion_valor: acc.retencion_valor + ivaVal,
      retencion_renta_valor: acc.retencion_renta_valor + rentaVal,
      total: acc.total + ivaVal + rentaVal,
    };
  }, { ...ZERO_TOTALS });

  return {
    retenciones: (pageResult.data as Retencion[]) ?? [],
    totalCount: pageResult.count ?? 0,
    totals,
  };
}

export function useRetencionesTable() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const queryClient = useQueryClient();

  const ruc = contribuyente?.ruc ?? null;

  const [filters, setFilters] = useState<RetencionesTableFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const debouncedBusqueda = useDebounce(filters.busqueda, 300);

  const periodStart = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).startOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).startOf("year").format("YYYY-MM-DD");

  const periodEnd = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).endOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).endOf("year").format("YYYY-MM-DD");

  const queryKey = [
    "retenciones-table",
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
      fetchRetencionesPage(ruc!, periodStart, periodEnd, filters, debouncedBusqueda, page),
    enabled: !!ruc,
    placeholderData: keepPreviousData,
  });

  const updateFilter = useCallback(
    <K extends keyof RetencionesTableFilters>(key: K, value: RetencionesTableFilters[K]) => {
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
    await queryClient.invalidateQueries({ queryKey: ["retenciones-table", ruc] });
  }, [queryClient, ruc]);

  return {
    retenciones: data?.retenciones ?? [],
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
