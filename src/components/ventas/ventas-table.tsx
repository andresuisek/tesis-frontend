"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  Receipt,
  Check,
  X,
} from "lucide-react";
import { Venta, TipoComprobante } from "@/lib/supabase";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface VentasTableProps {
  ventas: Venta[];
  loading: boolean;
  onEdit?: (venta: Venta) => void;
  onDelete?: (venta: Venta) => void;
  onView?: (venta: Venta) => void;
  onCrearNotaCredito?: (venta: Venta) => void;
  onCrearRetencion?: (venta: Venta) => void;
}

export function VentasTable({
  ventas,
  loading,
  onEdit,
  onDelete,
  onView,
  onCrearNotaCredito,
  onCrearRetencion,
}: VentasTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoComprobante | "all">("all");

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const formatearFecha = (fecha: string): string => {
    return dayjs(fecha).format("DD MMM YYYY");
  };

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
      nota_credito: "Nota de Crédito",
      liquidacion_compra: "Liquidación de Compra",
      retencion: "Retención",
      otros: "Otros",
    };
    return tipos[tipo] || tipo;
  };

  // Filtrar ventas
  const ventasFiltradas = ventas.filter((venta) => {
    const matchesSearch =
      venta.razon_social_cliente
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      venta.numero_comprobante
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      venta.ruc_cliente?.includes(searchTerm);

    const matchesType =
      tipoFilter === "all" || venta.tipo_comprobante === tipoFilter;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded w-full mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded w-full mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, RUC o comprobante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Tipo
                {tipoFilter !== "all" && (
                  <Badge variant="secondary" className="ml-2">
                    1
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTipoFilter("all")}
                className={tipoFilter === "all" ? "bg-accent" : ""}
              >
                Todos los tipos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTipoFilter("factura")}
                className={tipoFilter === "factura" ? "bg-accent" : ""}
              >
                Factura
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTipoFilter("nota_credito")}
                className={tipoFilter === "nota_credito" ? "bg-accent" : ""}
              >
                Nota de Crédito
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTipoFilter("liquidacion_compra")}
                className={
                  tipoFilter === "liquidacion_compra" ? "bg-accent" : ""
                }
              >
                Liquidación de Compra
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTipoFilter("otros")}
                className={tipoFilter === "otros" ? "bg-accent" : ""}
              >
                Otros
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>RUC Cliente</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">N/C</TableHead>
              <TableHead className="text-center">Ret.</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="h-24 text-center text-muted-foreground"
                >
                  {searchTerm || tipoFilter !== "all"
                    ? "No se encontraron ventas con los filtros aplicados."
                    : "No hay ventas registradas."}
                </TableCell>
              </TableRow>
            ) : (
              ventasFiltradas.map((venta) => (
                <TableRow key={venta.id}>
                  <TableCell>
                    <div className="font-medium">
                      {formatearFecha(venta.fecha_emision)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(venta.tipo_comprobante)}>
                      {formatearTipoComprobante(venta.tipo_comprobante)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {venta.numero_comprobante}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate">
                      {venta.razon_social_cliente}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-muted-foreground">
                      {venta.ruc_cliente || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className="text-sm">
                        {formatearMoneda(
                          venta.subtotal_0 +
                            venta.subtotal_8 +
                            venta.subtotal_15
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        0%: {formatearMoneda(venta.subtotal_0)} | 8%:{" "}
                        {formatearMoneda(venta.subtotal_8)} | 15%:{" "}
                        {formatearMoneda(venta.subtotal_15)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-info">
                    {formatearMoneda(venta.iva)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    {formatearMoneda(venta.total)}
                  </TableCell>
                  <TableCell className="text-center">
                    {venta.nota_credito_id ? (
                      <div className="flex justify-center">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <X className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {venta.retencion_id ? (
                      <div className="flex justify-center">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <X className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {venta.nota_credito_id || venta.retencion_id ? (
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-primary">
                          Ver detalle
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Afectado
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-success">
                        {formatearMoneda(venta.total)}
                      </span>
                    )}
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
                            Crear Nota de Crédito
                          </DropdownMenuItem>
                        )}
                        {venta.nota_credito_id && (
                          <DropdownMenuItem disabled className="text-muted-foreground">
                            <FileText className="mr-2 h-4 w-4 text-info" />
                            <span className="font-medium">
                              Tiene Nota de Crédito
                            </span>
                          </DropdownMenuItem>
                        )}
                        {onCrearRetencion && !venta.retencion_id && (
                          <DropdownMenuItem
                            onClick={() => onCrearRetencion(venta)}
                          >
                            <Receipt className="mr-2 h-4 w-4" />
                            Crear Retención
                          </DropdownMenuItem>
                        )}
                        {venta.retencion_id && (
                          <DropdownMenuItem disabled className="text-muted-foreground">
                            <Receipt className="mr-2 h-4 w-4 text-info" />
                            <span className="font-medium">
                              Tiene Retención
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
        </Table>
      </div>

      {/* Información de resultados */}
      {ventasFiltradas.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {ventasFiltradas.length} de {ventas.length} ventas
          {(searchTerm || tipoFilter !== "all") && " (filtradas)"}
        </div>
      )}
    </div>
  );
}
