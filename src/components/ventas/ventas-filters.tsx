"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, X } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface VentasFiltersProps {
  selectedYear: number;
  selectedMonth: number | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | null) => void;
  availableYears: number[];
}

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

export function VentasFilters({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  availableYears,
}: VentasFiltersProps) {
  const today = dayjs();
  const currentYear = today.year();

  const handleClearFilters = () => {
    onYearChange(currentYear);
    onMonthChange(null);
  };

  const hasActiveFilters =
    selectedYear !== currentYear || selectedMonth !== null;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/50 p-4 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        {/* Selector de Año */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Año:</span>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector de Mes */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Mes:</span>
          <Select
            value={selectedMonth?.toString() || "all"}
            onValueChange={(value) =>
              onMonthChange(value === "all" ? null : parseInt(value))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todos los meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Filtros activos */}
        {hasActiveFilters && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Filtros activos:
            </span>
            {selectedYear !== currentYear && (
              <Badge variant="secondary">Año: {selectedYear}</Badge>
            )}
            {selectedMonth && (
              <Badge variant="secondary">
                {MONTHS.find((m) => m.value === selectedMonth)?.label}
              </Badge>
            )}
          </div>
        )}

        {/* Botón para limpiar filtros */}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
