"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { Calendar, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDateFilter } from "@/contexts/date-filter-context";

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

interface TaxPeriodFilterProps {
  availableYears?: number[];
  className?: string;
  title?: string;
}

export function TaxPeriodFilter({
  availableYears,
  className,
  title = "Filtros",
}: TaxPeriodFilterProps) {
  const { year, month, setYear, setMonth, resetFilters } = useDateFilter();
  const currentYear = dayjs().year();

  const fallbackYears = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, [currentYear]);

  const yearOptions = useMemo(() => {
    const base = availableYears && availableYears.length > 0 ? availableYears : fallbackYears;
    const withSelected = base.includes(year) ? base : [...base, year];
    return [...new Set(withSelected)].sort((a, b) => b - a);
  }, [availableYears, fallbackYears, year]);

  const hasActiveFilters = year !== currentYear || month !== null;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/40 p-4 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {title}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Año:
            <Select
              value={year.toString()}
              onValueChange={(value) => setYear(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Mes:
            <Select
              value={month?.toString() ?? "all"}
              onValueChange={(value) =>
                setMonth(value === "all" ? null : parseInt(value, 10))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos los meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {MONTHS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filtros activos:</span>
            {year !== currentYear && (
              <Badge variant="secondary">Año {year}</Badge>
            )}
            {month !== null && (
              <Badge variant="secondary">
                {MONTHS.find((m) => m.value === month)?.label}
              </Badge>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}




