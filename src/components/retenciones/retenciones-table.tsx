"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Receipt } from "lucide-react";
import { Retencion } from "@/lib/supabase";
import type { RetencionesTotals } from "@/hooks/use-retenciones-table";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { cn } from "@/lib/utils";

interface RetencionesTableProps {
  retenciones: Retencion[];
  onView?: (retencion: Retencion) => void;
  isFetching?: boolean;
  totals?: RetencionesTotals;
}

export function RetencionesTable({
  retenciones,
  onView,
  isFetching,
  totals,
}: RetencionesTableProps) {
  dayjs.locale("es");

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha Emision</TableHead>
            <TableHead>Serie</TableHead>
            <TableHead className="hidden lg:table-cell">Clave de Acceso</TableHead>
            <TableHead className="text-right hidden md:table-cell">IVA %</TableHead>
            <TableHead className="text-right hidden md:table-cell">Valor IVA</TableHead>
            <TableHead className="text-right hidden md:table-cell">Renta %</TableHead>
            <TableHead className="text-right hidden md:table-cell">Valor Renta</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(isFetching && "opacity-50 transition-opacity")}>
          {retenciones.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                No se encontraron retenciones
              </TableCell>
            </TableRow>
          ) : (
            retenciones.map((ret) => {
              const totalRetencion =
                (ret.retencion_valor || 0) + (ret.retencion_renta_valor || 0);
              return (
                <TableRow key={ret.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {dayjs(ret.fecha_emision).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {ret.serie_comprobante || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs font-mono">
                      {ret.clave_acceso
                        ? `${ret.clave_acceso.substring(0, 12)}...`
                        : "N/A"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    {ret.retencion_iva_percent
                      ? `${ret.retencion_iva_percent}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell whitespace-nowrap">
                    {ret.retencion_valor
                      ? formatearMoneda(ret.retencion_valor)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    {ret.retencion_renta_percent
                      ? `${ret.retencion_renta_percent}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell whitespace-nowrap">
                    {ret.retencion_renta_valor
                      ? formatearMoneda(ret.retencion_renta_valor)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {formatearMoneda(totalRetencion)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(ret)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                        )}
                        {!onView && (
                          <DropdownMenuItem disabled>
                            No hay acciones disponibles
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        {totals && retenciones.length > 0 && (
          <TableFooter>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                Totales
              </TableCell>
              <TableCell className="text-right hidden md:table-cell" />
              <TableCell className="text-right hidden md:table-cell whitespace-nowrap">
                {formatearMoneda(totals.retencion_valor)}
              </TableCell>
              <TableCell className="text-right hidden md:table-cell" />
              <TableCell className="text-right hidden md:table-cell whitespace-nowrap">
                {formatearMoneda(totals.retencion_renta_valor)}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {formatearMoneda(totals.total)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
