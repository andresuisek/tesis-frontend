"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calculator,
  Receipt,
} from "lucide-react";
import { Venta } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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

  const renderTrend = (actual: number, anterior: number) => {
    if (!kpiAnterior) return null;
    const tendencia = calcularTendencia(actual, anterior);
    const Icon = tendencia.esPositiva ? TrendingUp : TrendingDown;

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex items-center gap-1 font-medium",
            tendencia.esPositiva ? "text-success" : "text-destructive"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {tendencia.porcentaje.toFixed(1)}%
        </span>
        <span>vs mes anterior</span>
      </div>
    );
  };

  const IconBadge = ({
    children,
  }: {
    children: ReactNode;
  }) => (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
      {children}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Ventas */}
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total de Ventas
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearNumero(kpiActual.totalVentas)}
              </p>
            </div>
            <IconBadge>
              <Receipt className="h-5 w-5" />
            </IconBadge>
          </div>
          {renderTrend(kpiActual.totalVentas, kpiAnterior?.totalVentas || 0)}
        </CardHeader>
      </Card>

      {/* Total Facturado */}
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total Facturado
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearMoneda(kpiActual.totalFacturado)}
              </p>
            </div>
            <IconBadge>
              <DollarSign className="h-5 w-5" />
            </IconBadge>
          </div>
          {renderTrend(
            kpiActual.totalFacturado,
            kpiAnterior?.totalFacturado || 0
          )}
        </CardHeader>
      </Card>

      {/* Venta Promedio */}
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Venta Promedio
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearMoneda(kpiActual.ventasPromedio)}
              </p>
            </div>
            <IconBadge>
              <Calculator className="h-5 w-5" />
            </IconBadge>
          </div>
          {renderTrend(
            kpiActual.ventasPromedio,
            kpiAnterior?.ventasPromedio || 0
          )}
        </CardHeader>
      </Card>

      {/* IVA Total */}
      <Card>
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                IVA Total
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearMoneda(kpiActual.ivaTotal)}
              </p>
            </div>
            <IconBadge>
              <FileText className="h-5 w-5" />
            </IconBadge>
          </div>
          {renderTrend(kpiActual.ivaTotal, kpiAnterior?.ivaTotal || 0)}
        </CardHeader>
        <CardContent className="border-t border-dashed border-border/60 pt-4">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Subtotal 0%</span>
              <span className="font-mono">{formatearMoneda(kpiActual.subtotal0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Subtotal 8%</span>
              <span className="font-mono">{formatearMoneda(kpiActual.subtotal8)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Subtotal 15%</span>
              <span className="font-mono">{formatearMoneda(kpiActual.subtotal15)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

