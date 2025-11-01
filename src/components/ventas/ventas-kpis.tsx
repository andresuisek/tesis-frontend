"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calculator,
  Receipt,
} from "lucide-react";
import { Venta } from "@/lib/supabase";

interface VentasKPIsProps {
  ventas: Venta[];
  mesAnterior?: Venta[];
}

interface KPIData {
  totalVentas: number;
  totalFacturado: number;
  ventasPromedio: number;
  ivaTotal: number;
  subtotal0: number;
  subtotal8: number;
  subtotal15: number;
  tendencia?: {
    ventas: number;
    facturado: number;
  };
}

export function VentasKPIs({ ventas, mesAnterior }: VentasKPIsProps) {
  const calcularKPIs = (ventasList: Venta[]): KPIData => {
    if (ventasList.length === 0) {
      return {
        totalVentas: 0,
        totalFacturado: 0,
        ventasPromedio: 0,
        ivaTotal: 0,
        subtotal0: 0,
        subtotal8: 0,
        subtotal15: 0,
      };
    }

    const totalVentas = ventasList.length;
    const totalFacturado = ventasList.reduce(
      (sum, venta) => sum + venta.total,
      0
    );
    const ventasPromedio = totalFacturado / totalVentas;
    const ivaTotal = ventasList.reduce((sum, venta) => sum + venta.iva, 0);
    const subtotal0 = ventasList.reduce(
      (sum, venta) => sum + venta.subtotal_0,
      0
    );
    const subtotal8 = ventasList.reduce(
      (sum, venta) => sum + venta.subtotal_8,
      0
    );
    const subtotal15 = ventasList.reduce(
      (sum, venta) => sum + venta.subtotal_15,
      0
    );

    return {
      totalVentas,
      totalFacturado,
      ventasPromedio,
      ivaTotal,
      subtotal0,
      subtotal8,
      subtotal15,
    };
  };

  const kpiActual = calcularKPIs(ventas);
  const kpiAnterior = mesAnterior ? calcularKPIs(mesAnterior) : null;

  const calcularTendencia = (
    actual: number,
    anterior: number
  ): { porcentaje: number; esPositiva: boolean } => {
    if (anterior === 0) return { porcentaje: 0, esPositiva: true };
    const porcentaje = ((actual - anterior) / anterior) * 100;
    return {
      porcentaje: Math.abs(porcentaje),
      esPositiva: porcentaje >= 0,
    };
  };

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const formatearNumero = (valor: number): string => {
    return new Intl.NumberFormat("es-EC").format(valor);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Ventas */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          <Receipt className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatearNumero(kpiActual.totalVentas)}
          </div>
          {kpiAnterior && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(() => {
                const tendencia = calcularTendencia(
                  kpiActual.totalVentas,
                  kpiAnterior.totalVentas
                );
                return (
                  <>
                    {tendencia.esPositiva ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        tendencia.esPositiva ? "text-green-500" : "text-red-500"
                      }
                    >
                      {tendencia.porcentaje.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs mes anterior</span>
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Facturado */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatearMoneda(kpiActual.totalFacturado)}
          </div>
          {kpiAnterior && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(() => {
                const tendencia = calcularTendencia(
                  kpiActual.totalFacturado,
                  kpiAnterior.totalFacturado
                );
                return (
                  <>
                    {tendencia.esPositiva ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        tendencia.esPositiva ? "text-green-500" : "text-red-500"
                      }
                    >
                      {tendencia.porcentaje.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs mes anterior</span>
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Venta Promedio */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Venta Promedio</CardTitle>
          <Calculator className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatearMoneda(kpiActual.ventasPromedio)}
          </div>
          {kpiAnterior && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(() => {
                const tendencia = calcularTendencia(
                  kpiActual.ventasPromedio,
                  kpiAnterior.ventasPromedio
                );
                return (
                  <>
                    {tendencia.esPositiva ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        tendencia.esPositiva ? "text-green-500" : "text-red-500"
                      }
                    >
                      {tendencia.porcentaje.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs mes anterior</span>
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IVA Total */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">IVA Total</CardTitle>
          <FileText className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatearMoneda(kpiActual.ivaTotal)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal 0%:</span>
                <span>{formatearMoneda(kpiActual.subtotal0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal 8%:</span>
                <span>{formatearMoneda(kpiActual.subtotal8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal 15%:</span>
                <span>{formatearMoneda(kpiActual.subtotal15)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

