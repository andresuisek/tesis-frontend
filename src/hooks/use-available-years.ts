"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

type YearRow = Record<string, string | null>;

export function useAvailableYears(table: string, dateColumn = "fecha_emision") {
  const { contribuyente } = useAuth();
  const [years, setYears] = useState<number[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!contribuyente?.ruc) {
      if (isMountedRef.current) {
        setYears([]);
      }
      return [];
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select(dateColumn)
        .eq("contribuyente_ruc", contribuyente.ruc);

      if (error) throw error;

      const yearSet = new Set<number>();
      data?.forEach((row: YearRow) => {
        const rawDate = row[dateColumn];
        if (!rawDate) return;
        const parsed = dayjs(rawDate);
        if (parsed.isValid()) {
          yearSet.add(parsed.year());
        }
      });

      yearSet.add(dayjs().year());
      const sorted = Array.from(yearSet).sort((a, b) => b - a);

      if (isMountedRef.current) {
        setYears(sorted);
      }

      return sorted;
    } catch (error) {
      console.warn("No se pudieron cargar los años disponibles:", error);
      return [];
    }
  }, [contribuyente?.ruc, dateColumn, table]);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();
  }, [refresh]);

  return { years, refresh };
}



