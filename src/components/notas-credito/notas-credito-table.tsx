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
import { MoreHorizontal, Eye, FileText } from "lucide-react";
import { NotaCredito } from "@/lib/supabase";
import type { NotasCreditoTotals } from "@/hooks/use-notas-credito-table";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { cn } from "@/lib/utils";

interface NotasCreditoTableProps {
  notasCredito: NotaCredito[];
  onView?: (notaCredito: NotaCredito) => void;
  isFetching?: boolean;
  totals?: NotasCreditoTotals;
}

export function NotasCreditoTable({
  notasCredito,
  onView,
  isFetching,
  totals,
}: NotasCreditoTableProps) {
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
            <TableHead>Numero Comprobante</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 0%</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 5%</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 8%</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 15%</TableHead>
            <TableHead className="text-right hidden lg:table-cell">IVA</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(isFetching && "opacity-50 transition-opacity")}>
          {notasCredito.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                No se encontraron notas de credito
              </TableCell>
            </TableRow>
          ) : (
            notasCredito.map((nc) => (
              <TableRow key={nc.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {dayjs(nc.fecha_emision).format("DD/MM/YYYY")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {nc.numero_comprobante}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(nc.subtotal_0)}
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(nc.subtotal_5)}
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(nc.subtotal_8)}
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(nc.subtotal_15)}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                  {formatearMoneda(nc.iva)}
                </TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">
                  {formatearMoneda(nc.total)}
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
                        <DropdownMenuItem onClick={() => onView(nc)}>
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
            ))
          )}
        </TableBody>
        {totals && notasCredito.length > 0 && (
          <TableFooter>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={2} className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                Totales
              </TableCell>
              <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                {formatearMoneda(totals.subtotal_0)}
              </TableCell>
              <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                {formatearMoneda(totals.subtotal_5)}
              </TableCell>
              <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                {formatearMoneda(totals.subtotal_8)}
              </TableCell>
              <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                {formatearMoneda(totals.subtotal_15)}
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                {formatearMoneda(totals.iva)}
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
