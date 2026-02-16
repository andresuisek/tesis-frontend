import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeadlineStatus } from "@/lib/tax-deadlines";

export type ViewMode = "cards" | "table";
export type StatusFilter = "todos" | DeadlineStatus;

interface ClientsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "cumplido", label: "Cumplido" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vencido", label: "Vencido" },
  { value: "sin_actividad", label: "Sin actividad" },
];

export function ClientsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
}: ClientsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search */}
      <div className="relative flex-1 w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por RUC, nombre o email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1 flex-wrap">
        {filterOptions.map(({ value, label }) => (
          <Button
            key={value}
            variant={statusFilter === value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => onStatusFilterChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex border rounded-md">
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 rounded-r-none", viewMode === "cards" && "bg-muted")}
          onClick={() => onViewModeChange("cards")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 rounded-l-none", viewMode === "table" && "bg-muted")}
          onClick={() => onViewModeChange("table")}
        >
          <Table2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
