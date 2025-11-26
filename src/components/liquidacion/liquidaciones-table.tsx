"use client";

import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";
import { TaxLiquidation } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  mapTaxLiquidationToSummary,
} from "@/lib/liquidacion";

dayjs.locale("es");

interface LiquidacionesTableProps {
  liquidaciones: TaxLiquidation[];
  loading?: boolean;
  onSelect?: (liquidacion: TaxLiquidation) => void;
  selectedId?: string | null;
}

export function LiquidacionesTable({
  liquidaciones,
  loading,
  onSelect,
  selectedId,
}: LiquidacionesTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Periodo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">IVA causado</TableHead>
            <TableHead className="text-right">Crédito compras</TableHead>
            <TableHead className="text-right">Retenciones IVA</TableHead>
            <TableHead className="text-right">Total a pagar</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead>Registrado</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {liquidaciones.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-24 text-center text-muted-foreground"
              >
                Aún no registras cierres de IVA.
              </TableCell>
            </TableRow>
          )}
          {liquidaciones.map((liquidacion) => {
            const resumen = mapTaxLiquidationToSummary(liquidacion);
            const status =
              resumen.calculo.totalAPagar > 0
                ? { label: "Por pagar", variant: "destructive" as const }
                : resumen.calculo.saldoAFavor > 0
                ? { label: "Crédito", variant: "secondary" as const }
                : { label: "Cerrado", variant: "outline" as const };

            return (
              <TableRow
                key={liquidacion.id}
                className={cn(
                  "transition-colors",
                  selectedId === liquidacion.id && "bg-muted/50"
                )}
              >
                <TableCell className="font-medium capitalize">
                  {resumen.periodo.label}
                </TableCell>
                <TableCell className="uppercase text-xs font-semibold text-muted-foreground">
                  {resumen.tipoPeriodo}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(resumen.calculo.ivaCausado)}
                </TableCell>
                <TableCell className="text-right text-sky-600">
                  {formatCurrency(resumen.calculo.creditoTributarioCompras)}
                </TableCell>
                <TableCell className="text-right text-emerald-600">
                  {formatCurrency(resumen.calculo.retencionesIVA)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(resumen.calculo.totalAPagar)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dayjs(liquidacion.created_at).format("DD/MM/YYYY HH:mm")}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.(liquidacion)}
                    className="gap-2"
                    disabled={!onSelect}
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

