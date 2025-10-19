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
import { Search, MoreHorizontal, Eye, FileText } from "lucide-react";
import { NotaCredito } from "@/lib/supabase";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface NotasCreditoTableProps {
  notasCredito: NotaCredito[];
  onView?: (notaCredito: NotaCredito) => void;
}

export function NotasCreditoTable({
  notasCredito,
  onView,
}: NotasCreditoTableProps) {
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

  // Obtener años únicos de las notas de crédito
  const availableYears = useMemo(() => {
    const years = new Set(
      notasCredito.map((nc) => dayjs(nc.fecha_emision).year().toString())
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [notasCredito]);

  // Filtrar notas de crédito
  const notasCreditoFiltradas = useMemo(() => {
    return notasCredito.filter((nc) => {
      const matchSearch =
        searchTerm === "" ||
        nc.numero_comprobante
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        nc.id.toLowerCase().includes(searchTerm.toLowerCase());

      const date = dayjs(nc.fecha_emision);
      const matchMonth =
        filterMonth === "all" || date.month() === parseInt(filterMonth);
      const matchYear =
        filterYear === "all" || date.year().toString() === filterYear;

      return matchSearch && matchMonth && matchYear;
    });
  }, [notasCredito, searchTerm, filterMonth, filterYear]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de comprobante o ID..."
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
              <TableHead>Número Comprobante</TableHead>
              <TableHead className="text-right">Subtotal 0%</TableHead>
              <TableHead className="text-right">Subtotal 8%</TableHead>
              <TableHead className="text-right">Subtotal 15%</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notasCreditoFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron notas de crédito.
                </TableCell>
              </TableRow>
            ) : (
              notasCreditoFiltradas.map((nc) => (
                <TableRow key={nc.id}>
                  <TableCell>
                    {dayjs(nc.fecha_emision).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      <span className="font-medium">
                        {nc.numero_comprobante}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatearMoneda(nc.subtotal_0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatearMoneda(nc.subtotal_8)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatearMoneda(nc.subtotal_15)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatearMoneda(nc.iva)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-red-600">
                      {formatearMoneda(nc.total)}
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
                            <DropdownMenuItem onClick={() => onView(nc)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalle
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resumen */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <p>
          Mostrando {notasCreditoFiltradas.length} de {notasCredito.length}{" "}
          notas de crédito
        </p>
        <p>
          Total:{" "}
          {formatearMoneda(
            notasCreditoFiltradas.reduce((sum, nc) => sum + nc.total, 0)
          )}
        </p>
      </div>
    </div>
  );
}
