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
import { Plus, ShoppingCart, Receipt, TrendingDown } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Tipo de datos para compras
type Compra = {
  id: string;
  fecha: string;
  proveedor: {
    ruc: string;
    razonSocial: string;
  };
  tipoComprobante: string;
  serie: string;
  numero: string;
  claveAcceso?: string;
  subtotal: number;
  iva: number;
  total: number;
  retencionIva?: number;
  retencionRenta?: number;
  estado: "Registrado" | "Conciliado" | "Pendiente";
};

// Datos de ejemplo
const comprasData: Compra[] = [
  {
    id: "1",
    fecha: "2024-01-15",
    proveedor: {
      ruc: "1790123456001",
      razonSocial: "Proveedores Unidos S.A.",
    },
    tipoComprobante: "Factura",
    serie: "001-002",
    numero: "000012345",
    claveAcceso: "1501202401179012345600110010020000123451234567890",
    subtotal: 5000.0,
    iva: 600.0,
    total: 5600.0,
    retencionIva: 60.0,
    retencionRenta: 100.0,
    estado: "Conciliado",
  },
  {
    id: "2",
    fecha: "2024-01-14",
    proveedor: {
      ruc: "0992345678001",
      razonSocial: "Suministros Técnicos Ltda.",
    },
    tipoComprobante: "Factura",
    serie: "001-001",
    numero: "000056789",
    subtotal: 2800.0,
    iva: 336.0,
    total: 3136.0,
    retencionIva: 33.6,
    retencionRenta: 56.0,
    estado: "Registrado",
  },
  {
    id: "3",
    fecha: "2024-01-13",
    proveedor: {
      ruc: "1723456789001",
      razonSocial: "Materiales de Construcción XYZ",
    },
    tipoComprobante: "Liquidación de Compra",
    serie: "001-001",
    numero: "000000123",
    subtotal: 1200.0,
    iva: 144.0,
    total: 1344.0,
    estado: "Pendiente",
  },
];

// Definición de columnas para la tabla
const columns: ColumnDef<Compra>[] = [
  {
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => {
      const fecha = new Date(row.getValue("fecha"));
      return fecha.toLocaleDateString("es-EC");
    },
  },
  {
    accessorKey: "proveedor",
    header: "Proveedor",
    cell: ({ row }) => {
      const proveedor = row.getValue("proveedor") as {
        ruc: string;
        razonSocial: string;
      };
      return (
        <div>
          <div className="font-medium">{proveedor.razonSocial}</div>
          <div className="text-sm text-muted-foreground">{proveedor.ruc}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "tipoComprobante",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.getValue("tipoComprobante") as string;
      return <Badge variant="outline">{tipo}</Badge>;
    },
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
            estado === "Conciliado"
              ? "default"
              : estado === "Registrado"
              ? "secondary"
              : "destructive"
          }
        >
          {estado}
        </Badge>
      );
    },
  },
];

export default function ComprasPage() {
  const [showNewCompraForm, setShowNewCompraForm] = useState(false);

  // Calcular totales
  const totalCompras = comprasData.reduce(
    (acc, compra) => acc + compra.total,
    0
  );
  const totalIvaCompras = comprasData.reduce(
    (acc, compra) => acc + compra.iva,
    0
  );
  const totalRetenciones = comprasData.reduce(
    (acc, compra) =>
      acc + (compra.retencionIva || 0) + (compra.retencionRenta || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Compras
          </h1>
          <p className="text-muted-foreground">
            Registra y administra todas tus compras y gastos deducibles
          </p>
        </div>
        <Button onClick={() => setShowNewCompraForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Compra
        </Button>
      </div>

      {/* Métricas de compras */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(totalCompras)}
            </div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Pagado</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(totalIvaCompras)}
            </div>
            <p className="text-xs text-muted-foreground">Crédito tributario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retenciones</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(totalRetenciones)}
            </div>
            <p className="text-xs text-muted-foreground">Total retenido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comprasData.length}</div>
            <p className="text-xs text-muted-foreground">Total registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de compras */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Compras</CardTitle>
          <CardDescription>
            Listado completo de todas las compras y gastos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={comprasData}
            searchKey="proveedor"
            searchPlaceholder="Buscar por proveedor..."
          />
        </CardContent>
      </Card>

      {/* Sección de análisis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Análisis por Tipo de Comprobante</CardTitle>
            <CardDescription>
              Distribución de compras por tipo de documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { tipo: "Factura", cantidad: 2, total: 8736.0 },
                { tipo: "Liquidación de Compra", cantidad: 1, total: 1344.0 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium">{item.tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.cantidad} documentos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat("es-EC", {
                        style: "currency",
                        currency: "USD",
                      }).format(item.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Conciliación</CardTitle>
            <CardDescription>
              Estado actual de los documentos registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { estado: "Conciliado", cantidad: 1, color: "bg-green-500" },
                { estado: "Registrado", cantidad: 1, color: "bg-blue-500" },
                { estado: "Pendiente", cantidad: 1, color: "bg-orange-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <div>
                      <p className="text-sm font-medium">{item.estado}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {item.cantidad} documentos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para nueva compra - placeholder */}
      {showNewCompraForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Nueva Compra</CardTitle>
              <CardDescription>
                Registra una nueva factura de compra o gasto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Formulario de nueva compra será implementado aquí...
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewCompraForm(false)}
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
