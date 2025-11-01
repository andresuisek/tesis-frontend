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
  Calculator,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// Tipo de datos para liquidación
type LiquidacionMensual = {
  periodo: string;
  ventas: {
    base0: number;
    base12: number;
    iva: number;
  };
  compras: {
    base0: number;
    base12: number;
    iva: number;
  };
  retenciones: {
    iva: number;
    renta: number;
  };
  liquidacion: {
    ivaADeber: number;
    ivaAFavor: number;
    rentaAPagar: number;
    totalAPagar: number;
  };
  estado: "Borrador" | "Calculado" | "Presentado" | "Pagado";
  fechaVencimiento: string;
};

// Datos de ejemplo
const liquidacionesData: LiquidacionMensual[] = [
  {
    periodo: "2024-01",
    ventas: {
      base0: 5000.0,
      base12: 45000.0,
      iva: 5400.0,
    },
    compras: {
      base0: 2000.0,
      base12: 15000.0,
      iva: 1800.0,
    },
    retenciones: {
      iva: 180.0,
      renta: 300.0,
    },
    liquidacion: {
      ivaADeber: 3420.0,
      ivaAFavor: 0,
      rentaAPagar: 800.0,
      totalAPagar: 4220.0,
    },
    estado: "Calculado",
    fechaVencimiento: "2024-02-12",
  },
  {
    periodo: "2023-12",
    ventas: {
      base0: 3000.0,
      base12: 38000.0,
      iva: 4560.0,
    },
    compras: {
      base0: 1500.0,
      base12: 12000.0,
      iva: 1440.0,
    },
    retenciones: {
      iva: 144.0,
      renta: 250.0,
    },
    liquidacion: {
      ivaADeber: 2976.0,
      ivaAFavor: 0,
      rentaAPagar: 750.0,
      totalAPagar: 3726.0,
    },
    estado: "Pagado",
    fechaVencimiento: "2024-01-12",
  },
];

export default function LiquidacionPage() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("2024-01");
  const [mostrarCalculadora, setMostrarCalculadora] = useState(false);

  const liquidacionActual =
    liquidacionesData.find((l) => l.periodo === periodoSeleccionado) ||
    liquidacionesData[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Liquidación de Impuestos
          </h1>
          <p className="text-muted-foreground">
            Calcula y presenta tus obligaciones tributarias mensuales
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setMostrarCalculadora(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            Calculadora
          </Button>
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Generar Declaración
          </Button>
        </div>
      </div>

      {/* Selector de período */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Período</CardTitle>
          <CardDescription>
            Elige el mes para revisar o calcular la liquidación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {liquidacionesData.map((liquidacion) => (
              <Button
                key={liquidacion.periodo}
                variant={
                  periodoSeleccionado === liquidacion.periodo
                    ? "default"
                    : "outline"
                }
                onClick={() => setPeriodoSeleccionado(liquidacion.periodo)}
              >
                {new Date(liquidacion.periodo + "-01").toLocaleDateString(
                  "es-EC",
                  {
                    year: "numeric",
                    month: "long",
                  }
                )}
                <Badge
                  className="ml-2"
                  variant={
                    liquidacion.estado === "Pagado"
                      ? "default"
                      : liquidacion.estado === "Presentado"
                      ? "secondary"
                      : liquidacion.estado === "Calculado"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {liquidacion.estado}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen de ventas y compras */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
              Ventas del Período
            </CardTitle>
            <CardDescription>
              Ingresos registrados en{" "}
              {new Date(liquidacionActual.periodo + "-01").toLocaleDateString(
                "es-EC",
                {
                  year: "numeric",
                  month: "long",
                }
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Base 0%:</span>
              <span className="font-medium">
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(liquidacionActual.ventas.base0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Base 12%:</span>
              <span className="font-medium">
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(liquidacionActual.ventas.base12)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">IVA Causado:</span>
              <span className="font-bold text-green-600">
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(liquidacionActual.ventas.iva)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="mr-2 h-4 w-4 text-blue-600" />
              Compras del Período
            </CardTitle>
            <CardDescription>
              Gastos y adquisiciones registradas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Base 0%:</span>
              <span className="font-medium">
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(liquidacionActual.compras.base0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Base 12%:</span>
              <span className="font-medium">
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(liquidacionActual.compras.base12)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">Crédito Tributario:</span>
              <span className="font-bold text-blue-600">
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(liquidacionActual.compras.iva)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cálculo de liquidación */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidación Final</CardTitle>
          <CardDescription>
            Cálculo automático de impuestos a pagar o saldo a favor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Cálculo IVA
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>IVA Causado (Ventas):</span>
                  <span>
                    {new Intl.NumberFormat("es-EC", {
                      style: "currency",
                      currency: "USD",
                    }).format(liquidacionActual.ventas.iva)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Crédito Tributario (Compras):</span>
                  <span>
                    -
                    {new Intl.NumberFormat("es-EC", {
                      style: "currency",
                      currency: "USD",
                    }).format(liquidacionActual.compras.iva)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Retenciones de IVA:</span>
                  <span>
                    -
                    {new Intl.NumberFormat("es-EC", {
                      style: "currency",
                      currency: "USD",
                    }).format(liquidacionActual.retenciones.iva)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>IVA a Pagar:</span>
                  <span className="text-red-600">
                    {new Intl.NumberFormat("es-EC", {
                      style: "currency",
                      currency: "USD",
                    }).format(liquidacionActual.liquidacion.ivaADeber)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Impuesto a la Renta
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Retenciones Recibidas:</span>
                  <span>
                    -
                    {new Intl.NumberFormat("es-EC", {
                      style: "currency",
                      currency: "USD",
                    }).format(liquidacionActual.retenciones.renta)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Renta a Pagar:</span>
                  <span className="text-red-600">
                    {new Intl.NumberFormat("es-EC", {
                      style: "currency",
                      currency: "USD",
                    }).format(liquidacionActual.liquidacion.rentaAPagar)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {liquidacionActual.liquidacion.totalAPagar > 0 ? (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="text-lg font-semibold">Total a Pagar:</span>
              </div>
              <span className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(liquidacionActual.liquidacion.totalAPagar)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Fecha límite de pago:{" "}
              {new Date(liquidacionActual.fechaVencimiento).toLocaleDateString(
                "es-EC"
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Acciones rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formulario 104</CardTitle>
            <CardDescription>Declaración mensual de IVA</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Generar F104
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formulario 103</CardTitle>
            <CardDescription>Retenciones en la fuente</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generar F103
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anexos</CardTitle>
            <CardDescription>ATS y otros anexos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generar ATS
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal calculadora - placeholder */}
      {mostrarCalculadora && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Calculadora de Impuestos</CardTitle>
              <CardDescription>
                Herramienta rápida para cálculos tributarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Calculadora de impuestos será implementada aquí...
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setMostrarCalculadora(false)}
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
