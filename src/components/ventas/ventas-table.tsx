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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Receipt,
  Check,
  X,
} from "lucide-react";
import { Venta, TipoComprobante } from "@/lib/supabase";
import type { VentasTotals } from "@/hooks/use-ventas-table";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { cn } from "@/lib/utils";

interface VentasTableProps {
  ventas: Venta[];
  onEdit?: (venta: Venta) => void;
  onDelete?: (venta: Venta) => void;
  onView?: (venta: Venta) => void;
  onCrearNotaCredito?: (venta: Venta) => void;
  onCrearRetencion?: (venta: Venta) => void;
  isFetching?: boolean;
  totals?: VentasTotals;
}

const getBadgeVariant = (tipo: TipoComprobante) => {
  switch (tipo) {
    case "factura":
      return "default";
    case "nota_credito":
      return "destructive";
    case "liquidacion_compra":
      return "secondary";
    case "retencion":
      return "outline";
    default:
      return "outline";
  }
};

const formatearTipoComprobante = (tipo: TipoComprobante): string => {
  const tipos = {
    factura: "Factura",
    nota_credito: "Nota de Credito",
    liquidacion_compra: "Liquidacion de Compra",
    retencion: "Retencion",
    otros: "Otros",
  };
  return tipos[tipo] || tipo;
};

export function VentasTable({
  ventas,
  onEdit,
  onDelete,
  onView,
  onCrearNotaCredito,
  onCrearRetencion,
  isFetching,
  totals,
}: VentasTableProps) {
  dayjs.locale("es");

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const formatearFecha = (fecha: string): string => {
    return dayjs(fecha).format("DD/MM/YYYY");
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="hidden lg:table-cell">Comprobante</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 0%</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 5%</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 8%</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Subtotal 15%</TableHead>
            <TableHead className="text-right hidden lg:table-cell">IVA</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center hidden md:table-cell">N/C</TableHead>
            <TableHead className="text-center hidden md:table-cell">Ret.</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(isFetching && "opacity-50 transition-opacity")}>
          {ventas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center text-muted-foreground">
                No se encontraron ventas
              </TableCell>
            </TableRow>
          ) : (
            ventas.map((venta) => (
              <TableRow key={venta.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {formatearFecha(venta.fecha_emision)}
                </TableCell>
                <TableCell>
                  <Badge variant={getBadgeVariant(venta.tipo_comprobante)}>
                    {formatearTipoComprobante(venta.tipo_comprobante)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-col min-w-[120px]">
                    <span className="font-mono text-xs">
                      {venta.numero_comprobante}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col max-w-[200px] min-w-[150px]">
                          {venta.razon_social_cliente && (
                            <span className="font-medium text-sm truncate">
                              {venta.razon_social_cliente}
                            </span>
                          )}
                          {venta.ruc_cliente && (
                            <span className="text-xs text-muted-foreground">
                              {venta.ruc_cliente}
                            </span>
                          )}
                          {!venta.razon_social_cliente && !venta.ruc_cliente && (
                            <span className="text-muted-foreground italic">
                              Sin informacion
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      {venta.razon_social_cliente && (
                        <TooltipContent>
                          <p>{venta.razon_social_cliente}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(venta.subtotal_0)}
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(venta.subtotal_5)}
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(venta.subtotal_8)}
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                  {formatearMoneda(venta.subtotal_15)}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                  {formatearMoneda(venta.iva)}
                </TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">
                  {formatearMoneda(venta.total)}
                </TableCell>
                <TableCell className="text-center hidden md:table-cell">
                  {venta.nota_credito_id ? (
                    <Check className="h-4 w-4 text-primary mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300 mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-center hidden md:table-cell">
                  {venta.retencion_id ? (
                    <Check className="h-4 w-4 text-primary mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300 mx-auto" />
                  )}
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
                        <DropdownMenuItem onClick={() => onView(venta)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                      )}
                      {onCrearNotaCredito && !venta.nota_credito_id && (
                        <DropdownMenuItem
                          onClick={() => onCrearNotaCredito(venta)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Crear Nota de Credito
                        </DropdownMenuItem>
                      )}
                      {venta.nota_credito_id && (
                        <DropdownMenuItem disabled className="text-muted-foreground">
                          <FileText className="mr-2 h-4 w-4 text-info" />
                          <span className="font-medium">
                            Tiene Nota de Credito
                          </span>
                        </DropdownMenuItem>
                      )}
                      {onCrearRetencion && !venta.retencion_id && (
                        <DropdownMenuItem
                          onClick={() => onCrearRetencion(venta)}
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          Crear Retencion
                        </DropdownMenuItem>
                      )}
                      {venta.retencion_id && (
                        <DropdownMenuItem disabled className="text-muted-foreground">
                          <Receipt className="mr-2 h-4 w-4 text-info" />
                          <span className="font-medium">
                            Tiene Retencion
                          </span>
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(venta)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(venta)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {totals && ventas.length > 0 && (
          <TableFooter>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={4} className="text-right text-xs uppercase tracking-wide text-muted-foreground">
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
              <TableCell className="hidden md:table-cell" />
              <TableCell className="hidden md:table-cell" />
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
