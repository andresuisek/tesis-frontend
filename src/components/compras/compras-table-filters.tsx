"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ComprasTableFilters as Filters } from "@/hooks/use-compras-table";
import type { RubroCompra, TipoComprobante } from "@/lib/supabase";

const RUBROS: { value: RubroCompra; label: string }[] = [
  { value: "vivienda", label: "Vivienda" },
  { value: "alimentacion", label: "Alimentacion" },
  { value: "salud", label: "Salud" },
  { value: "educacion", label: "Educacion" },
  { value: "vestimenta", label: "Vestimenta" },
  { value: "turismo", label: "Turismo" },
  { value: "actividad_profesional", label: "Act. Profesional" },
  { value: "no_definido", label: "No Definido" },
];

const TIPOS_COMPROBANTE: { value: TipoComprobante; label: string }[] = [
  { value: "factura", label: "Factura" },
  { value: "nota_credito", label: "Nota de credito" },
  { value: "liquidacion_compra", label: "Liquidacion de compra" },
  { value: "retencion", label: "Retencion" },
  { value: "otros", label: "Otros" },
];

interface ComprasTableFiltersProps {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onReset: () => void;
  activeFilterCount: number;
  isFetching: boolean;
}

export function ComprasTableFilters({
  filters,
  onFilterChange,
  onReset,
  activeFilterCount,
  isFetching,
}: ComprasTableFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proveedor o RUC..."
          value={filters.busqueda}
          onChange={(e) => onFilterChange("busqueda", e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Rubro select */}
      <Select
        value={filters.rubro ?? "all"}
        onValueChange={(value) =>
          onFilterChange("rubro", value === "all" ? null : (value as RubroCompra))
        }
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Rubro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los rubros</SelectItem>
          {RUBROS.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tipo comprobante select */}
      <Select
        value={filters.tipoComprobante ?? "all"}
        onValueChange={(value) =>
          onFilterChange(
            "tipoComprobante",
            value === "all" ? null : (value as TipoComprobante)
          )
        }
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          {TIPOS_COMPROBANTE.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
