"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeadlineStatusBadge } from "./deadline-status-badge";
import type { ClientOverviewData } from "@/hooks/use-clients-overview";

interface ClientsTableViewProps {
  clients: ClientOverviewData[];
  onSelect: (ruc: string) => void;
  onUnlink: (ruc: string) => void;
}

const regimenLabels: Record<string, string> = {
  general: "General",
  rimpe_negocio_popular: "RIMPE Popular",
  rimpe_emprendedor: "RIMPE Emprendedor",
};

const obligacionLabels: Record<string, string> = {
  mensual: "Mensual",
  semestral: "Semestral",
  anual: "Anual",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ClientsTableView({ clients, onSelect, onUnlink }: ClientsTableViewProps) {
  const columns = useMemo<ColumnDef<ClientOverviewData>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Cliente",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.firstName} {row.original.lastName}
            </div>
            <div className="text-xs text-muted-foreground font-mono">{row.original.ruc}</div>
          </div>
        ),
      },
      {
        accessorKey: "tipoRegimen",
        header: "Régimen",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {regimenLabels[row.original.tipoRegimen] ?? row.original.tipoRegimen}
          </Badge>
        ),
      },
      {
        accessorKey: "tipoObligacion",
        header: "Obligación",
        cell: ({ row }) => (
          <span className="text-sm">
            {obligacionLabels[row.original.tipoObligacion] ?? row.original.tipoObligacion}
          </span>
        ),
      },
      {
        accessorKey: "vencimiento",
        header: "Vencimiento",
        accessorFn: (row) => row.deadlineInfo.nextDeadlineDate.valueOf(),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.deadlineInfo.nextDeadlineDate.format("DD MMM YYYY")}</span>
        ),
      },
      {
        accessorKey: "deadlineStatus",
        header: "Estado",
        cell: ({ row }) => (
          <DeadlineStatusBadge
            status={row.original.deadlineStatus}
            daysUntilDeadline={row.original.deadlineInfo.daysUntilDeadline}
            compact
          />
        ),
      },
      {
        accessorKey: "ventas",
        header: "Ventas",
        accessorFn: (row) => row.financial.totalVentas,
        cell: ({ row }) => (
          <span className="text-sm font-medium">{formatCurrency(row.original.financial.totalVentas)}</span>
        ),
      },
      {
        accessorKey: "compras",
        header: "Compras",
        accessorFn: (row) => row.financial.totalCompras,
        cell: ({ row }) => (
          <span className="text-sm font-medium">{formatCurrency(row.original.financial.totalCompras)}</span>
        ),
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={row.original.isActive ? "secondary" : "default"}
              className="h-7 text-xs"
              onClick={() => onSelect(row.original.ruc)}
              disabled={row.original.isActive}
            >
              {row.original.isActive ? "Activo" : "Trabajar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onUnlink(row.original.ruc)}
            >
              Desvincular
            </Button>
          </div>
        ),
      },
    ],
    [onSelect, onUnlink],
  );

  return <DataTable columns={columns} data={clients} searchKey="fullName" searchPlaceholder="Buscar cliente..." />;
}
