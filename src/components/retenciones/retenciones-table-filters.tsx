"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { RetencionesTableFilters as Filters } from "@/hooks/use-retenciones-table";

interface RetencionesTableFiltersProps {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onReset: () => void;
  activeFilterCount: number;
  isFetching: boolean;
}

export function RetencionesTableFilters({
  filters,
  onFilterChange,
  onReset,
  activeFilterCount,
  isFetching,
}: RetencionesTableFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por serie o clave de acceso..."
          value={filters.busqueda}
          onChange={(e) => onFilterChange("busqueda", e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Date from */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 w-[140px] justify-start text-left font-normal",
              !filters.fechaDesde && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {filters.fechaDesde
              ? format(new Date(filters.fechaDesde + "T12:00:00"), "dd MMM yyyy", { locale: es })
              : "Desde"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.fechaDesde ? new Date(filters.fechaDesde + "T12:00:00") : undefined}
            onSelect={(date) =>
              onFilterChange(
                "fechaDesde",
                date ? format(date, "yyyy-MM-dd") : null
              )
            }
            locale={es}
          />
        </PopoverContent>
      </Popover>

      {/* Date to */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 w-[140px] justify-start text-left font-normal",
              !filters.fechaHasta && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {filters.fechaHasta
              ? format(new Date(filters.fechaHasta + "T12:00:00"), "dd MMM yyyy", { locale: es })
              : "Hasta"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.fechaHasta ? new Date(filters.fechaHasta + "T12:00:00") : undefined}
            onSelect={(date) =>
              onFilterChange(
                "fechaHasta",
                date ? format(date, "yyyy-MM-dd") : null
              )
            }
            locale={es}
          />
        </PopoverContent>
      </Popover>

      {/* Active filters badge + clear */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="h-6 px-2 text-xs">
            {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Limpiar
          </Button>
        </div>
      )}

      {/* Fetching indicator */}
      {isFetching && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
