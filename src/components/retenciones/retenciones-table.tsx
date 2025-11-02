"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreHorizontal, Eye, Receipt } from "lucide-react";
import { Retencion } from "@/lib/supabase";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface RetencionesTableProps {
  retenciones: Retencion[];
  onView?: (retencion: Retencion) => void;
}

export function RetencionesTable({
  retenciones,
  onView,
}: RetencionesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  // Formatear moneda
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  // Obtener años únicos de las retenciones
  const availableYears = useMemo(() => {
    const years = new Set(
      retenciones.map((ret) => dayjs(ret.fecha_emision).year().toString())
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [retenciones]);

  // Filtrar retenciones
  const retencionesFiltradas = useMemo(() => {
    return retenciones.filter((ret) => {
      const matchSearch =
        searchTerm === "" ||
        ret.serie_comprobante
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        ret.clave_acceso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.id.toLowerCase().includes(searchTerm.toLowerCase());

      const date = dayjs(ret.fecha_emision);
      const matchMonth =
        filterMonth === "all" || date.month() === parseInt(filterMonth);
      const matchYear =
        filterYear === "all" || date.year().toString() === filterYear;

      return matchSearch && matchMonth && matchYear;
    });
  }, [retenciones, searchTerm, filterMonth, filterYear]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por serie, clave de acceso o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los meses</SelectItem>
            <SelectItem value="0">Enero</SelectItem>
            <SelectItem value="1">Febrero</SelectItem>
            <SelectItem value="2">Marzo</SelectItem>
            <SelectItem value="3">Abril</SelectItem>
            <SelectItem value="4">Mayo</SelectItem>
            <SelectItem value="5">Junio</SelectItem>
            <SelectItem value="6">Julio</SelectItem>
            <SelectItem value="7">Agosto</SelectItem>
            <SelectItem value="8">Septiembre</SelectItem>
            <SelectItem value="9">Octubre</SelectItem>
            <SelectItem value="10">Noviembre</SelectItem>
            <SelectItem value="11">Diciembre</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Serie</TableHead>
              <TableHead>Clave de Acceso</TableHead>
              <TableHead className="text-right">IVA %</TableHead>
              <TableHead className="text-right">Valor IVA</TableHead>
              <TableHead className="text-right">Renta %</TableHead>
              <TableHead className="text-right">Valor Renta</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retencionesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No se encontraron retenciones.
                </TableCell>
              </TableRow>
            ) : (
              retencionesFiltradas.map((ret) => {
                const totalRetencion =
                  (ret.retencion_valor || 0) + (ret.retencion_renta_valor || 0);
                return (
                  <TableRow key={ret.id}>
                    <TableCell>
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
                    <TableCell>
                      <span className="text-xs font-mono">
                        {ret.clave_acceso
                          ? `${ret.clave_acceso.substring(0, 12)}...`
                          : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {ret.retencion_iva_percent
                        ? `${ret.retencion_iva_percent}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {ret.retencion_valor
                        ? formatearMoneda(ret.retencion_valor)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {ret.retencion_renta_percent
                        ? `${ret.retencion_renta_percent}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {ret.retencion_renta_valor
                        ? formatearMoneda(ret.retencion_renta_valor)
                        : "-"}
                    </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-foreground">
                      {formatearMoneda(totalRetencion)}
                    </span>
                  </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
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
                              <DropdownMenuItem onClick={() => onView(ret)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalle
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resumen */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <p>
          Mostrando {retencionesFiltradas.length} de {retenciones.length}{" "}
          retenciones
        </p>
        <p>
          Total:{" "}
          {formatearMoneda(
            retencionesFiltradas.reduce(
              (sum, ret) =>
                sum +
                (ret.retencion_valor || 0) +
                (ret.retencion_renta_valor || 0),
              0
            )
          )}
        </p>
      </div>
    </div>
  );
}
