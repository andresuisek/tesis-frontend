"use client";

import type { ReactNode } from "react";

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
import { cn } from "@/lib/utils";

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

  const renderTrend = (actual: number, anterior: number) => {
    if (!kpiAnterior) return null;
    const tendencia = calcularTendencia(actual, anterior);
    const Icon = tendencia.esPositiva ? TrendingUp : TrendingDown;

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex items-center gap-1 font-medium",
            tendencia.esPositiva ? "text-primary" : "text-destructive"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {tendencia.porcentaje.toFixed(1)}%
        </span>
        <span>vs mes anterior</span>
      </div>
    );
  };

  const IconBadge = ({ children }: { children: ReactNode }) => (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
      {children}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Compras registradas
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearNumero(kpiActual.totalCompras)}
              </p>
            </div>
            <IconBadge>
              <ShoppingCart className="h-5 w-5" />
            </IconBadge>
          </div>
          {renderTrend(kpiActual.totalCompras, kpiAnterior?.totalCompras || 0)}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total gastado
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearMoneda(kpiActual.totalGastado)}
              </p>
            </div>
            <IconBadge>
              <DollarSign className="h-5 w-5" />
            </IconBadge>
          </div>
          {renderTrend(kpiActual.totalGastado, kpiAnterior?.totalGastado || 0)}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Compra promedio
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearMoneda(kpiActual.comprasPromedio)}
              </p>
            </div>
            <IconBadge>
              <Calculator className="h-5 w-5" />
            </IconBadge>
          </div>
          {renderTrend(kpiActual.comprasPromedio, kpiAnterior?.comprasPromedio || 0)}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                IVA asociado
              </CardTitle>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatearMoneda(kpiActual.ivaTotal)}
              </p>
            </div>
            <IconBadge>
              <FileText className="h-5 w-5" />
            </IconBadge>
          </div>
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

