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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/declaracion-renta";
import { DeclaracionRenta } from "@/lib/supabase";

dayjs.locale("es");

interface DeclaracionesRentaTableProps {
  declaraciones: DeclaracionRenta[];
  loading?: boolean;
  onSelect?: (declaracion: DeclaracionRenta) => void;
  selectedId?: string | null;
}

export function DeclaracionesRentaTable({
  declaraciones,
  loading,
  onSelect,
  selectedId,
}: DeclaracionesRentaTableProps) {
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
            <TableHead>Año fiscal</TableHead>
            <TableHead className="text-right">Ingresos brutos</TableHead>
            <TableHead className="text-right">Base imponible</TableHead>
            <TableHead className="text-right">Impuesto causado</TableHead>
            <TableHead className="text-right">Retenciones</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead>Registrado</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {declaraciones.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-24 text-center text-muted-foreground"
              >
                Aún no registras declaraciones de renta.
              </TableCell>
            </TableRow>
          )}
          {declaraciones.map((dec) => {
            const impuestoAPagar = Number(dec.impuesto_a_pagar) || 0;
            const status =
              impuestoAPagar > 0
                ? { label: "Por pagar", variant: "destructive" as const }
                : impuestoAPagar < 0
                  ? { label: "A favor", variant: "secondary" as const }
                  : { label: "Sin impuesto", variant: "outline" as const };

            return (
              <TableRow
                key={dec.id}
                className={cn(
                  "transition-colors",
                  selectedId === dec.id && "bg-muted/50"
                )}
              >
                <TableCell className="font-medium">{dec.anio_fiscal}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(dec.ingresos_brutos) || 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(dec.base_imponible) || 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(dec.impuesto_causado) || 0)}
                </TableCell>
                <TableCell className="text-right text-sky-600">
                  {formatCurrency(Number(dec.retenciones_renta) || 0)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {impuestoAPagar < 0 ? (
                    <span className="text-emerald-600">
                      {formatCurrency(Math.abs(impuestoAPagar))}
                    </span>
                  ) : (
                    formatCurrency(impuestoAPagar)
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dayjs(dec.created_at).format("DD/MM/YYYY HH:mm")}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.(dec)}
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
