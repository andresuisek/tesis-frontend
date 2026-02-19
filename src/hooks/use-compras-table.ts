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

interface FetchComprasResult {
  compras: Compra[];
  totalCount: number;
}

async function fetchComprasPage(
  ruc: string,
  periodStart: string,
  periodEnd: string,
  filters: ComprasTableFilters,
  debouncedBusqueda: string,
  page: number,
): Promise<FetchComprasResult> {
  let query = supabase
    .from("compras")
    .select("*", { count: "exact" })
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd);

  // Table-level filters
  if (filters.rubro) {
    query = query.eq("rubro", filters.rubro);
  }
  if (filters.tipoComprobante) {
    query = query.eq("tipo_comprobante", filters.tipoComprobante);
  }
  if (debouncedBusqueda) {
    const term = `%${debouncedBusqueda}%`;
    query = query.or(
      `razon_social_proveedor.ilike.${term},ruc_proveedor.ilike.${term}`
    );
  }
  if (filters.fechaDesde) {
    query = query.gte("fecha_emision", filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    query = query.lte("fecha_emision", filters.fechaHasta);
  }

  const from = (page - 1) * ITEMS_POR_PAGINA;
  const to = from + ITEMS_POR_PAGINA - 1;

  const { data, count, error } = await query
    .order("fecha_emision", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    compras: (data as Compra[]) ?? [],
    totalCount: count ?? 0,
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
