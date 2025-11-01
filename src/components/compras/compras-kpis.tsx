"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calculator,
  ShoppingCart,
} from "lucide-react";
import { Compra } from "@/lib/supabase";

interface ComprasKPIsProps {
  compras: Compra[];
  mesAnterior?: Compra[];
}

interface KPIData {
  totalCompras: number;
  totalGastado: number;
  comprasPromedio: number;
  ivaTotal: number;
  subtotal0: number;
  subtotal8: number;
  subtotal15: number;
}

export function ComprasKPIs({ compras, mesAnterior }: ComprasKPIsProps) {
  const calcularKPIs = (comprasList: Compra[]): KPIData => {
    if (comprasList.length === 0) {
      return {
        totalCompras: 0,
        totalGastado: 0,
        comprasPromedio: 0,
        ivaTotal: 0,
        subtotal0: 0,
        subtotal8: 0,
        subtotal15: 0,
      };
    }

    const totalCompras = comprasList.length;
    const totalGastado = comprasList.reduce(
      (sum, compra) => sum + compra.total,
      0
    );
    const comprasPromedio = totalGastado / totalCompras;
    const ivaTotal = comprasList.reduce((sum, compra) => sum + compra.iva, 0);
    const subtotal0 = comprasList.reduce(
      (sum, compra) => sum + compra.subtotal_0,
      0
    );
    const subtotal8 = comprasList.reduce(
      (sum, compra) => sum + compra.subtotal_8,
      0
    );
    const subtotal15 = comprasList.reduce(
      (sum, compra) => sum + compra.subtotal_15,
      0
    );

    return {
      totalCompras,
      totalGastado,
      comprasPromedio,
      ivaTotal,
      subtotal0,
      subtotal8,
      subtotal15,
    };
  };

  const kpiActual = calcularKPIs(compras);
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
      {/* Total Compras */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
          <ShoppingCart className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatearNumero(kpiActual.totalCompras)}
          </div>
          {kpiAnterior && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(() => {
                const tendencia = calcularTendencia(
                  kpiActual.totalCompras,
                  kpiAnterior.totalCompras
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

      {/* Total Gastado */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gastado</CardTitle>
          <DollarSign className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatearMoneda(kpiActual.totalGastado)}
          </div>
          {kpiAnterior && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(() => {
                const tendencia = calcularTendencia(
                  kpiActual.totalGastado,
                  kpiAnterior.totalGastado
                );
                return (
                  <>
                    {tendencia.esPositiva ? (
                      <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                    )}
                    <span
                      className={
                        tendencia.esPositiva ? "text-red-500" : "text-green-500"
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

      {/* Compra Promedio */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compra Promedio</CardTitle>
          <Calculator className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatearMoneda(kpiActual.comprasPromedio)}
          </div>
          {kpiAnterior && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(() => {
                const tendencia = calcularTendencia(
                  kpiActual.comprasPromedio,
                  kpiAnterior.comprasPromedio
                );
                return (
                  <>
                    {tendencia.esPositiva ? (
                      <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                    )}
                    <span
                      className={
                        tendencia.esPositiva ? "text-red-500" : "text-green-500"
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

