"use client";

import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  LiquidacionSummaryData,
  formatCurrency,
} from "@/lib/liquidacion";

dayjs.locale("es");

interface LiquidacionSummaryProps {
  resumen?: LiquidacionSummaryData | null;
  loading?: boolean;
  emptyMessage?: string;
  compact?: boolean;
}

const statusBadge = (resumen: LiquidacionSummaryData) => {
  if (resumen.calculo.totalAPagar > 0) {
    return { label: "Por pagar", variant: "destructive" as const };
  }
  if (resumen.calculo.saldoAFavor > 0) {
    return { label: "Crédito a favor", variant: "secondary" as const };
  }
  return { label: "Cerrado", variant: "outline" as const };
};

export function LiquidacionSummary({
  resumen,
  loading,
  emptyMessage = "Selecciona o genera un cierre para ver el detalle.",
}: LiquidacionSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!resumen) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const badge = statusBadge(resumen);
  const dueDate = resumen.periodo.dueDate
    ? dayjs(resumen.periodo.dueDate).format("DD/MM/YYYY")
    : "";
  const ventasBaseGravada = resumen.ventas.base8 + resumen.ventas.base15;
  const comprasBaseGravada = resumen.compras.base8 + resumen.compras.base15;
  const showCreditoArrastrado =
    resumen.ajustes.creditoAplicadoAnterior > 0 ||
    resumen.ajustes.creditoArrastradoAnterior > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase text-muted-foreground">Periodo</p>
          <h2 className="text-2xl font-semibold capitalize">
            {resumen.periodo.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            Desde {dayjs(resumen.periodo.startDate).format("DD/MM/YYYY")} hasta{" "}
            {dayjs(resumen.periodo.endDate).format("DD/MM/YYYY")}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Ventas del periodo
            </CardTitle>
            <CardDescription>
              Bases imponibles registradas en el periodo seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Base 0%:</span>
              <span className="font-medium">
                {formatCurrency(resumen.ventas.base0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Base gravada (IVA):
              </span>
              <span className="font-medium">
                {formatCurrency(ventasBaseGravada)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>IVA causado:</span>
              <span className="text-green-600">
                {formatCurrency(resumen.ventas.iva)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-sky-600" />
              Compras del periodo
            </CardTitle>
            <CardDescription>
              Créditos tributarios disponibles por adquisiciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Base 0%:</span>
              <span className="font-medium">
                {formatCurrency(resumen.compras.base0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Base gravada (IVA):
              </span>
              <span className="font-medium">
                {formatCurrency(comprasBaseGravada)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>Crédito tributario:</span>
              <span className="text-sky-600">
                {formatCurrency(resumen.compras.iva)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liquidación final</CardTitle>
          <CardDescription>
            Resultado automático según ventas, compras y retenciones del periodo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Cálculo IVA
              </h4>
              <div className="flex items-center justify-between">
                <span>IVA causado (ventas)</span>
                <span>{formatCurrency(resumen.calculo.ivaCausado)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Crédito tributario (compras)</span>
                <span className="text-red-500">
                  -{formatCurrency(resumen.calculo.creditoTributarioCompras)}
                </span>
              </div>
              {showCreditoArrastrado && (
                <div className="flex items-center justify-between">
                  <span>Crédito arrastrado</span>
                  <span className="text-red-500">
                    -{formatCurrency(resumen.ajustes.creditoAplicadoAnterior)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Retenciones de IVA</span>
                <span className="text-red-500">
                  -{formatCurrency(resumen.calculo.retencionesIVA)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>IVA a pagar</span>
                <span className="text-red-600">
                  {formatCurrency(resumen.calculo.ivaAPagar)}
                </span>
              </div>
              {resumen.calculo.saldoAFavor > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <span>Crédito a favor</span>
                  <span>{formatCurrency(resumen.calculo.saldoAFavor)}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Impuesto a la renta
              </h4>
              <div className="flex items-center justify-between">
                <span>Retenciones recibidas</span>
                <span className="text-red-500">
                  -{formatCurrency(resumen.retenciones.renta)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Renta a pagar</span>
                <span className="text-red-600">
                  {formatCurrency(resumen.calculo.rentaAPagar)}
                </span>
              </div>
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Ajusta este valor desde el modal al confirmar el cierre si
                necesitas ingresar cálculos manuales de impuesto a la renta.
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {resumen.calculo.totalAPagar > 0 ? (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
                <span className="text-lg font-semibold">Total a pagar</span>
              </div>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(resumen.calculo.totalAPagar)}
              </span>
            </div>
            {dueDate && (
              <p className="mt-2 text-sm text-muted-foreground">
                Fecha límite de pago estimada: {dueDate}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {(resumen.ajustes.advertencias.length > 0 || resumen.notas) && (
        <div className="space-y-4">
          {resumen.ajustes.advertencias.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <Info className="h-5 w-5" />
              <AlertTitle>Advertencias del cálculo</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {resumen.ajustes.advertencias.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {resumen.notas && (
            <Alert>
              <Info className="h-5 w-5" />
              <AlertTitle>Notas del cierre</AlertTitle>
              <AlertDescription>{resumen.notas}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}

