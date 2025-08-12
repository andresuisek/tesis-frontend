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
import {
  Plus,
  Receipt,
  Calculator,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Tipo de datos para retenciones
type Retencion = {
  id: string;
  fecha: string;
  emisor: {
    ruc: string;
    razonSocial: string;
  };
  tipoComprobante: string;
  serie: string;
  numero: string;
  claveAcceso: string;
  fechaEmision: string;
  baseImponible: number;
  porcentajeRetencion: number;
  valorRetenido: number;
  tipoRetencion: "IVA" | "Renta";
  codigoRetencion: string;
  estado: "Emitido" | "Enviado" | "Autorizado" | "Anulado";
};

// Datos de ejemplo
const retencionesData: Retencion[] = [
  {
    id: "1",
    fecha: "2024-01-15",
    emisor: {
      ruc: "1790123456001",
      razonSocial: "Mi Empresa S.A.",
    },
    tipoComprobante: "Comprobante de Retención",
    serie: "001-001",
    numero: "000000123",
    claveAcceso: "1501202401179012345600170010010000001231234567890",
    fechaEmision: "2024-01-15",
    baseImponible: 5000.0,
    porcentajeRetencion: 2.0,
    valorRetenido: 100.0,
    tipoRetencion: "Renta",
    codigoRetencion: "303",
    estado: "Autorizado",
  },
  {
    id: "2",
    fecha: "2024-01-15",
    emisor: {
      ruc: "1790123456001",
      razonSocial: "Mi Empresa S.A.",
    },
    tipoComprobante: "Comprobante de Retención",
    serie: "001-001",
    numero: "000000124",
    claveAcceso: "1501202401179012345600170010010000001241234567891",
    fechaEmision: "2024-01-15",
    baseImponible: 600.0,
    porcentajeRetencion: 10.0,
    valorRetenido: 60.0,
    tipoRetencion: "IVA",
    codigoRetencion: "725",
    estado: "Autorizado",
  },
  {
    id: "3",
    fecha: "2024-01-14",
    emisor: {
      ruc: "1790123456001",
      razonSocial: "Mi Empresa S.A.",
    },
    tipoComprobante: "Comprobante de Retención",
    serie: "001-001",
    numero: "000000125",
    claveAcceso: "1401202401179012345600170010010000001251234567892",
    fechaEmision: "2024-01-14",
    baseImponible: 2800.0,
    porcentajeRetencion: 1.0,
    valorRetenido: 28.0,
    tipoRetencion: "Renta",
    codigoRetencion: "312",
    estado: "Emitido",
  },
];

// Definición de columnas para la tabla
const columns: ColumnDef<Retencion>[] = [
  {
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => {
      const fecha = new Date(row.getValue("fecha"));
      return fecha.toLocaleDateString("es-EC");
    },
  },
  {
    accessorKey: "emisor",
    header: "Emisor",
    cell: ({ row }) => {
      const emisor = row.getValue("emisor") as {
        ruc: string;
        razonSocial: string;
      };
      return (
        <div>
          <div className="font-medium">{emisor.razonSocial}</div>
          <div className="text-sm text-muted-foreground">{emisor.ruc}</div>
        </div>
      );
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
    accessorKey: "tipoRetencion",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.getValue("tipoRetencion") as string;
      return (
        <Badge variant={tipo === "IVA" ? "default" : "secondary"}>{tipo}</Badge>
      );
    },
  },
  {
    accessorKey: "valorRetenido",
    header: "Valor Retenido",
    cell: ({ row }) => {
      const valor = parseFloat(row.getValue("valorRetenido"));
      const formatted = new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
      }).format(valor);
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
            estado === "Autorizado"
              ? "default"
              : estado === "Enviado"
              ? "secondary"
              : estado === "Emitido"
              ? "outline"
              : "destructive"
          }
        >
          {estado}
        </Badge>
      );
    },
  },
];

export default function RetencionesPage() {
  const [showNewRetencionForm, setShowNewRetencionForm] = useState(false);

  // Calcular totales
  const totalRetenciones = retencionesData.reduce(
    (acc, ret) => acc + ret.valorRetenido,
    0
  );
  const retencionesIVA = retencionesData
    .filter((ret) => ret.tipoRetencion === "IVA")
    .reduce((acc, ret) => acc + ret.valorRetenido, 0);
  const retencionesRenta = retencionesData
    .filter((ret) => ret.tipoRetencion === "Renta")
    .reduce((acc, ret) => acc + ret.valorRetenido, 0);
  const documentosAutorizados = retencionesData.filter(
    (ret) => ret.estado === "Autorizado"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Retenciones
          </h1>
          <p className="text-muted-foreground">
            Administra los comprobantes de retención emitidos y recibidos
          </p>
        </div>
        <Button onClick={() => setShowNewRetencionForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Retención
        </Button>
      </div>

      {/* Métricas de retenciones */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Retenido
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(totalRetenciones)}
            </div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retención IVA</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(retencionesIVA)}
            </div>
            <p className="text-xs text-muted-foreground">Retenciones de IVA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retención Renta
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-EC", {
                style: "currency",
                currency: "USD",
              }).format(retencionesRenta)}
            </div>
            <p className="text-xs text-muted-foreground">
              Retenciones de Renta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Autorizados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentosAutorizados}</div>
            <p className="text-xs text-muted-foreground">
              de {retencionesData.length} documentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de retenciones */}
      <Card>
        <CardHeader>
          <CardTitle>Comprobantes de Retención</CardTitle>
          <CardDescription>
            Listado completo de todas las retenciones emitidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={retencionesData}
            searchKey="emisor"
            searchPlaceholder="Buscar por emisor..."
          />
        </CardContent>
      </Card>

      {/* Sección de análisis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calculadora de Retenciones</CardTitle>
            <CardDescription>
              Herramienta para calcular retenciones automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Base Imponible</label>
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Tipo de Retención
                  </label>
                  <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="iva">Retención IVA</option>
                    <option value="renta">Retención Renta</option>
                  </select>
                </div>
              </div>
              <Button className="w-full">
                <Calculator className="mr-2 h-4 w-4" />
                Calcular Retención
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Códigos de Retención Frecuentes</CardTitle>
            <CardDescription>
              Códigos más utilizados según el tipo de bien o servicio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  codigo: "303",
                  descripcion: "Honorarios profesionales",
                  porcentaje: "2%",
                },
                {
                  codigo: "312",
                  descripcion: "Servicios técnicos",
                  porcentaje: "1%",
                },
                {
                  codigo: "725",
                  descripcion: "Servicios profesionales",
                  porcentaje: "10%",
                },
                {
                  codigo: "727",
                  descripcion: "Servicios generales",
                  porcentaje: "30%",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div>
                    <p className="text-sm font-medium">Código {item.codigo}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.descripcion}
                    </p>
                  </div>
                  <Badge variant="outline">{item.porcentaje}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para nueva retención - placeholder */}
      {showNewRetencionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Nueva Retención</CardTitle>
              <CardDescription>
                Generar un nuevo comprobante de retención
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Formulario de nueva retención será implementado aquí...
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewRetencionForm(false)}
                >
                  Cancelar
                </Button>
                <Button>Generar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
