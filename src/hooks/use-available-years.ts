"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

type YearRow = Record<string, string | null>;

async function fetchAvailableYears(
  ruc: string,
  table: string,
  dateColumn: string,
): Promise<number[]> {
  const { data, error } = await supabase
    .from(table)
    .select(dateColumn)
    .eq("contribuyente_ruc", ruc);

  if (error) throw error;

  const yearSet = new Set<number>();
  const rows = data as unknown as YearRow[] | null;
  rows?.forEach((row: YearRow) => {
    const rawDate = row[dateColumn];
    if (!rawDate) return;
    const parsed = dayjs(rawDate);
    if (parsed.isValid()) {
      yearSet.add(parsed.year());
    }
  });

  yearSet.add(dayjs().year());
  return Array.from(yearSet).sort((a, b) => b - a);
}

export function useAvailableYears(table: string, dateColumn = "fecha_emision") {
  // Usar contribuyenteEfectivo para soportar tanto contribuyentes como contadores
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const queryClient = useQueryClient();

  const ruc = contribuyente?.ruc ?? null;

  const { data: years = [] } = useQuery({
    queryKey: ["available-years", ruc, table, dateColumn],
    queryFn: () => fetchAvailableYears(ruc!, table, dateColumn),
    enabled: !!ruc,
    // Los años disponibles cambian muy poco, staleTime alto
    staleTime: 10 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["available-years", ruc, table, dateColumn],
    });
    return years;
  }, [queryClient, ruc, table, dateColumn, years]);

  return { years, refresh };
}
