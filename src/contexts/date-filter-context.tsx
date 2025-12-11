"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import dayjs from "dayjs";

type DateFilterContextValue = {
  year: number;
  month: number | null;
  setYear: (year: number) => void;
  setMonth: (month: number | null) => void;
  resetFilters: () => void;
};

const STORAGE_KEY = "tax-period-filter";

const DateFilterContext = createContext<DateFilterContextValue | undefined>(
  undefined
);

const getInitialFilters = () => {
  const currentYear = dayjs().year();

  if (typeof window === "undefined") {
    return { year: currentYear, month: null as number | null };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { year: currentYear, month: null as number | null };
    }

    const parsed = JSON.parse(stored) as {
      year?: number;
      month?: number | null;
    };

    if (!parsed.year) {
      return { year: currentYear, month: null as number | null };
    }

    return {
      year: parsed.year,
      month:
        typeof parsed.month === "number" || parsed.month === null
          ? parsed.month
          : null,
    };
  } catch (error) {
    console.warn("No se pudo restaurar el filtro global:", error);
    return { year: currentYear, month: null as number | null };
  }
};

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [{ year, month }, setFilters] = useState(getInitialFilters);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ year, month })
      );
    } catch (error) {
      console.warn("No se pudo persistir el filtro global:", error);
    }
  }, [year, month]);

  const contextValue = useMemo<DateFilterContextValue>(() => {
    return {
      year,
      month,
      setYear: (newYear: number) =>
        setFilters((prev) => ({ ...prev, year: newYear })),
      setMonth: (newMonth: number | null) =>
        setFilters((prev) => ({ ...prev, month: newMonth })),
      resetFilters: () =>
        setFilters(() => ({
          year: dayjs().year(),
          month: null,
        })),
    };
  }, [year, month]);

  return (
    <DateFilterContext.Provider value={contextValue}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);

  if (!context) {
    throw new Error(
      "useDateFilter debe utilizarse dentro de un DateFilterProvider"
    );
  }

  return context;
}



