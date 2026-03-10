"use client";

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
  DeclaracionRentaSummaryData,
  formatCurrency,
  formatFechaLimite,
} from "@/lib/declaracion-renta";

interface DeclaracionRentaSummaryProps {
  resumen?: DeclaracionRentaSummaryData | null;
  loading?: boolean;
  emptyMessage?: string;
}

const statusBadge = (resumen: DeclaracionRentaSummaryData) => {
  const val = resumen.calculo.impuestoAPagar;
  if (val > 0) return { label: "Por pagar", variant: "destructive" as const };
  if (val < 0) return { label: "Saldo a favor", variant: "secondary" as const };
  return { label: "Sin impuesto", variant: "outline" as const };
};

const CATEGORIAS_LABELS: { key: string; label: string }[] = [
  { key: "vivienda", label: "Vivienda" },
  { key: "alimentacion", label: "Alimentación" },
  { key: "educacion", label: "Educación" },
  { key: "vestimenta", label: "Vestimenta" },
  { key: "salud", label: "Salud" },
  { key: "turismo", label: "Turismo" },
];

export function DeclaracionRentaSummary({
  resumen,
  loading,
  emptyMessage = "Selecciona o genera una declaración para ver el detalle.",
}: DeclaracionRentaSummaryProps) {
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
  const c = resumen.calculo;
  const g = c.gastosPersonales;
  const tramo = c.tramoAplicado;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase text-muted-foreground">Año fiscal</p>
          <h2 className="text-2xl font-semibold">{resumen.anioFiscal}</h2>
          <p className="text-sm text-muted-foreground">
            Fecha límite: {formatFechaLimite(resumen.fechaLimite)}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {/* Ingresos y costos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Ingresos y costos
            </CardTitle>
            <CardDescription>
              Ingresos brutos menos costos de actividad profesional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ingresos brutos:</span>
              <span className="font-medium">
                {formatCurrency(c.ingresosBrutos)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">(-) Costos actividad:</span>
              <span className="font-medium text-red-500">
                -{formatCurrency(c.costosGastosDeducibles)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>Utilidad del ejercicio:</span>
              <span className="text-green-600">
                {formatCurrency(c.utilidadEjercicio)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Gastos personales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-sky-600" />
              Gastos personales deducibles
            </CardTitle>
            <CardDescription>
              Por categoría con límites aplicados
              {resumen.cargasFamiliares > 0 &&
                ` (${resumen.cargasFamiliares} carga${resumen.cargasFamiliares > 1 ? "s" : ""} familiar${resumen.cargasFamiliares > 1 ? "es" : ""})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Categoría</th>
                    <th className="pb-2 text-right font-medium">Real</th>
                    <th className="pb-2 text-right font-medium">Límite</th>
                    <th className="pb-2 text-right font-medium">Deducible</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {CATEGORIAS_LABELS.map(({ key, label }) => {
                    const cat = g[key as keyof typeof g] as {
                      real: number;
                      limite: number;
                      deducible: number;
                    };
                    return (
                      <tr key={key}>
                        <td className="py-1.5">{label}</td>
                        <td className="py-1.5 text-right">
                          {formatCurrency(cat.real)}
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {formatCurrency(cat.limite)}
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          {formatCurrency(cat.deducible)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right">{formatCurrency(g.totalReal)}</td>
                    <td className="pt-2 text-right text-muted-foreground">
                      {formatCurrency(g.topeTotal)}
                    </td>
                    <td className="pt-2 text-right text-sky-600">
                      {formatCurrency(g.totalDeducible)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cálculo del impuesto */}
      <Card>
        <CardHeader>
          <CardTitle>Cálculo del impuesto a la renta</CardTitle>
          <CardDescription>
            Aplicación de tabla progresiva y retenciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Base imponible
              </h4>
              <div className="flex items-center justify-between">
                <span>Utilidad del ejercicio</span>
                <span>{formatCurrency(c.utilidadEjercicio)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>(-) Gastos personales deducibles</span>
                <span className="text-red-500">
                  -{formatCurrency(g.totalDeducible)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 font-semibold">
                <span>= Base imponible</span>
                <span>{formatCurrency(c.baseImponible)}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Impuesto y retenciones
              </h4>
              {tramo && (
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  Tramo {tramo.orden}: {formatCurrency(tramo.fraccion_basica)} –{" "}
                  {formatCurrency(tramo.exceso_hasta)} ({tramo.porcentaje_excedente}
                  % sobre excedente)
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Impuesto causado</span>
                <span className="font-medium">
                  {formatCurrency(c.impuestoCausado)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>(-) Retenciones en la fuente</span>
                <span className="text-red-500">
                  -{formatCurrency(c.retencionesRenta)}
                </span>
              </div>
              <div className="border-t pt-3">
                {c.impuestoAPagar > 0 ? (
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Impuesto a pagar</span>
                    <span className="text-red-600">
                      {formatCurrency(c.impuestoAPagar)}
                    </span>
                  </div>
                ) : c.impuestoAPagar < 0 ? (
                  <div className="flex items-center justify-between text-base font-semibold text-emerald-600">
                    <span>Saldo a favor</span>
                    <span>{formatCurrency(Math.abs(c.impuestoAPagar))}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Impuesto a pagar</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {c.impuestoAPagar > 0 ? (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
                <span className="text-lg font-semibold">
                  {c.impuestoAPagar > 0
                    ? "Total a pagar"
                    : c.impuestoAPagar < 0
                      ? "Saldo a favor"
                      : "Sin impuesto"}
                </span>
              </div>
              <span
                className={`text-2xl font-bold ${c.impuestoAPagar > 0 ? "text-red-600" : c.impuestoAPagar < 0 ? "text-emerald-600" : ""}`}
              >
                {formatCurrency(Math.abs(c.impuestoAPagar))}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Fecha límite de declaración: {formatFechaLimite(resumen.fechaLimite)}
            </p>
          </div>
        </CardContent>
      </Card>

      {(resumen.advertencias.length > 0 || resumen.notas) && (
        <div className="space-y-4">
          {resumen.advertencias.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <Info className="h-5 w-5" />
              <AlertTitle>Advertencias del cálculo</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {resumen.advertencias.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {resumen.notas && (
            <Alert>
              <Info className="h-5 w-5" />
              <AlertTitle>Notas</AlertTitle>
              <AlertDescription>{resumen.notas}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
