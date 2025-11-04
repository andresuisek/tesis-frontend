"use client";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Compra, RubroCompra } from "@/lib/supabase";
import { MoreHorizontal, Trash2, Search, Download } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ComprasTableProps {
  compras: Compra[];
  onEliminar?: (compra: Compra) => void;
}

const rubrosLabels: Record<RubroCompra, string> = {
  no_definido: "No Definido",
  vivienda: "Vivienda",
  alimentacion: "Alimentación",
  salud: "Salud",
  educacion: "Educación",
  vestimenta: "Vestimenta",
  turismo: "Turismo",
  actividad_profesional: "Act. Profesional",
};

const rubroClasses: Record<RubroCompra, string> = {
  no_definido:
    "bg-muted/60 text-muted-foreground border-border/60 dark:bg-muted/30 dark:text-muted-foreground",
  vivienda:
    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50",
  alimentacion:
    "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50",
  salud:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50",
  educacion:
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50",
  vestimenta:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  turismo:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  actividad_profesional:
    "bg-muted/60 text-muted-foreground border-border/60 dark:bg-muted/30 dark:text-muted-foreground",
};

export function ComprasTable({ compras, onEliminar }: ComprasTableProps) {
  dayjs.locale("es");
  const [busqueda, setBusqueda] = useState("");

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const formatearFecha = (fecha: string): string => {
    return dayjs(fecha).format("DD/MM/YYYY");
  };

  // Filtrar compras por búsqueda
  const comprasFiltradas = compras.filter((compra) => {
    if (!busqueda) return true;
    const busquedaLower = busqueda.toLowerCase();
    return (
      compra.razon_social_proveedor?.toLowerCase().includes(busquedaLower) ||
      compra.ruc_proveedor?.toLowerCase().includes(busquedaLower) ||
      compra.numero_comprobante?.toLowerCase().includes(busquedaLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Registro de compras</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Compras registradas según los filtros aplicados
            </p>
          </div>

          {/* Barra de herramientas */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor, RUC o comprobante..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="hidden lg:table-cell">Comprobante</TableHead>
                <TableHead className="hidden md:table-cell">Rubro</TableHead>
                <TableHead className="text-right hidden xl:table-cell">Subtotal 0%</TableHead>
                <TableHead className="text-right hidden xl:table-cell">Subtotal 8%</TableHead>
                <TableHead className="text-right hidden xl:table-cell">Subtotal 15%</TableHead>
                <TableHead className="text-right hidden lg:table-cell">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comprasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    {busqueda ? "No se encontraron resultados" : "No se encontraron compras"}
                  </TableCell>
                </TableRow>
              ) : (
                comprasFiltradas.map((compra) => (
                  <TableRow key={compra.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatearFecha(compra.fecha_emision)}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col max-w-[200px] min-w-[150px]">
                              {compra.razon_social_proveedor && (
                                <span className="font-medium text-sm truncate">
                                  {compra.razon_social_proveedor}
                                </span>
                              )}
                              {compra.ruc_proveedor && (
                                <span className="text-xs text-muted-foreground">
                                  {compra.ruc_proveedor}
                                </span>
                              )}
                              {!compra.razon_social_proveedor && !compra.ruc_proveedor && (
                                <span className="text-muted-foreground italic">
                                  Sin información
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          {compra.razon_social_proveedor && (
                            <TooltipContent>
                              <p>{compra.razon_social_proveedor}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col min-w-[120px]">
                        {compra.tipo_comprobante && (
                          <span className="text-xs capitalize text-muted-foreground">
                            {compra.tipo_comprobante.replace("_", " ")}
                          </span>
                        )}
                        {compra.numero_comprobante && (
                          <span className="font-mono text-xs">
                            {compra.numero_comprobante}
                          </span>
                        )}
                        {compra.clave_acceso && (
                          <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]" title={compra.clave_acceso}>
                            {compra.clave_acceso}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          rubroClasses[compra.rubro]
                        )}
                      >
                        {rubrosLabels[compra.rubro]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                      {formatearMoneda(compra.subtotal_0)}
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                      {formatearMoneda(compra.subtotal_8)}
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                      {formatearMoneda(compra.subtotal_15)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                      {formatearMoneda(compra.iva)}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {formatearMoneda(compra.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          {!onEliminar && (
                            <DropdownMenuItem disabled>
                              No hay acciones disponibles
                            </DropdownMenuItem>
                          )}
                          {onEliminar && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onEliminar(compra)}
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
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

