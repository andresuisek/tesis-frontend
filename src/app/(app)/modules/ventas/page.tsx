"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calendar, DollarSign } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Tipo de datos para ventas
type Venta = {
  id: string;
  fecha: string;
  cliente: {
    ruc: string;
    razonSocial: string;
  };
  tipoComprobante: string;
  serie: string;
  numero: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: "Emitido" | "Anulado" | "Pendiente";
};

// Datos de ejemplo
const ventasData: Venta[] = [
  {
    id: "1",
    fecha: "2024-01-15",
    cliente: {
      ruc: "1234567890001",
      razonSocial: "Empresa ABC S.A.",
    },
    tipoComprobante: "Factura",
    serie: "001-001",
    numero: "000001234",
    subtotal: 1000.0,
    iva: 120.0,
    total: 1120.0,
    estado: "Emitido",
  },
  {
    id: "2",
    fecha: "2024-01-14",
    cliente: {
      ruc: "0987654321001",
      razonSocial: "Comercial XYZ Ltda.",
    },
    tipoComprobante: "Factura",
    serie: "001-001",
    numero: "000001233",
    subtotal: 2500.0,
    iva: 300.0,
    total: 2800.0,
    estado: "Emitido",
  },
  {
    id: "3",
    fecha: "2024-01-13",
    cliente: {
      ruc: "1122334455001",
      razonSocial: "Distribuidora 123",
    },
    tipoComprobante: "Nota de Crédito",
    serie: "001-001",
    numero: "000000567",
    subtotal: -500.0,
    iva: -60.0,
    total: -560.0,
    estado: "Emitido",
  },
];

// Definición de columnas para la tabla
const columns: ColumnDef<Venta>[] = [
  {
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => {
      const fecha = new Date(row.getValue("fecha"));
      return fecha.toLocaleDateString("es-EC");
    },
  },
  {
    accessorKey: "cliente",
    header: "Cliente",
    cell: ({ row }) => {
      const cliente = row.getValue("cliente") as {
        ruc: string;
        razonSocial: string;
      };
      return (
        <div>
          <div className="font-medium">{cliente.razonSocial}</div>
          <div className="text-sm text-muted-foreground">{cliente.ruc}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "tipoComprobante",
    header: "Tipo",
  },
  {
    accessorKey: "serie",
    header: "Serie",
  },
  {
    accessorKey: "numero",
    header: "Número",
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => {
      const total = parseFloat(row.getValue("total"));
      const formatted = new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
      }).format(total);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.getValue("estado") as string;
      return (
        <Badge
          variant={
            estado === "Emitido"
              ? "default"
              : estado === "Anulado"
              ? "destructive"
              : "secondary"
          }
        >
          {estado}
        </Badge>
      );
    },
  },
];

export default function VentasPage() {
  const [showNewVentaForm, setShowNewVentaForm] = useState(false);

  // Calcular totales
  const totalVentas = ventasData.reduce((acc, venta) => acc + venta.total, 0);
  const ventasDelMes = ventasData.filter((venta) => {
    const fechaVenta = new Date(venta.fecha);
    const hoy = new Date();
    return (
      fechaVenta.getMonth() === hoy.getMonth() &&
      fechaVenta.getFullYear() === hoy.getFullYear()
    );
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Ventas
          </h1>
          <p className="text-muted-foreground">
            Administra todas tus facturas, notas de crédito y débito
          </p>
        </div>
        <Button onClick={() => setShowNewVentaForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      {/* Métricas de ventas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(totalVentas)}
            </div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas del Mes
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ventasDelMes}</div>
            <p className="text-xs text-muted-foreground">Documentos emitidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Generado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(ventasData.reduce((acc, venta) => acc + venta.iva, 0))}
            </div>
            <p className="text-xs text-muted-foreground">IVA por cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Ventas</CardTitle>
          <CardDescription>
            Listado completo de todas las ventas registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={ventasData}
            searchKey="cliente"
            searchPlaceholder="Buscar por cliente..."
          />
        </CardContent>
      </Card>

      {/* Modal para nueva venta - placeholder */}
      {showNewVentaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Nueva Venta</CardTitle>
              <CardDescription>
                Registra una nueva factura o documento de venta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Formulario de nueva venta será implementado aquí...
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewVentaForm(false)}
                >
                  Cancelar
                </Button>
                <Button>Guardar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
