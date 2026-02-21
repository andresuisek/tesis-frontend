"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AgentMessage } from "../agent-message";
import { WizardState } from "../import-wizard";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Info,
  Lightbulb,
  PlusCircle,
  ShoppingCart,
  TrendingUp,
  Receipt,
  FileX,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StepSummaryProps {
  wizardState: WizardState;
  periodo: { mes: number; anio: number };
  onNewImport: () => void;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function StepSummary({ wizardState, periodo, onNewImport }: StepSummaryProps) {
  const { resumen } = wizardState;

  if (!resumen) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando resumen...</p>
      </div>
    );
  }

  const mesNombre = MESES[periodo.mes - 1];

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage
        message={`¡Listo! He procesado toda tu información tributaria de ${mesNombre} ${periodo.anio}. Aquí tienes un resumen ejecutivo con los datos más importantes y algunas recomendaciones.`}
        animate={false}
      />

      {/* KPIs principales — solo muestra secciones con datos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-wizard-fade-in-up" style={{ animationDelay: "100ms" }}>
        {resumen.ventasCount > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ventas</p>
                  <p className="text-2xl font-semibold">
                    ${resumen.ventasTotal.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {resumen.ventasCount} documentos
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {resumen.comprasCount > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compras</p>
                  <p className="text-2xl font-semibold">
                    ${resumen.comprasTotal.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {resumen.comprasCount} documentos
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {resumen.notasCreditoCount > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileX className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas de Crédito</p>
                  <p className="text-2xl font-semibold">
                    ${resumen.notasCreditoTotal.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {resumen.notasCreditoCount} documentos
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(resumen.ivaVentas > 0 || resumen.ivaCompras > 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    resumen.ivaAPagar > 0 ? "bg-destructive/10" : "bg-primary/10"
                  )}
                >
                  <Calculator
                    className={cn(
                      "h-5 w-5",
                      resumen.ivaAPagar > 0
                        ? "text-destructive"
                        : "text-primary"
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    IVA a Pagar
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-semibold",
                      resumen.ivaAPagar > 0 && "text-destructive"
                    )}
                  >
                    ${resumen.ivaAPagar.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {resumen.ivaAPagar > 0 ? "Por liquidar" : "Sin saldo a pagar"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {resumen.retencionesCount > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Retenciones</p>
                  <p className="text-2xl font-semibold">
                    ${resumen.retencionesTotal.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {resumen.retencionesCount} documentos
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detalle IVA — solo si hay datos de ventas o compras */}
      {(resumen.ivaVentas > 0 || resumen.ivaCompras > 0) && <Card className="animate-wizard-fade-in-up" style={{ animationDelay: "250ms" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Detalle de IVA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-4 text-center", resumen.notasCreditoCount > 0 ? "grid-cols-4" : "grid-cols-3")}>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">IVA en Ventas</p>
              <p className="text-xl font-bold text-foreground">
                ${resumen.ivaVentas.toFixed(2)}
              </p>
            </div>
            {resumen.notasCreditoCount > 0 && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">IVA Notas Crédito</p>
                <p className="text-xl font-bold text-foreground">
                  -${resumen.ivaNotasCredito.toFixed(2)}
                </p>
              </div>
            )}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Crédito Tributario</p>
              <p className="text-xl font-bold text-foreground">
                -${resumen.ivaCompras.toFixed(2)}
              </p>
            </div>
            <div
              className={cn(
                "p-4 rounded-lg",
                resumen.ivaAPagar > 0
                  ? "bg-destructive/5"
                  : "bg-muted/50"
              )}
            >
              <p className="text-sm text-muted-foreground">Resultado</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  resumen.ivaAPagar > 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                ${resumen.ivaAPagar.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>}

      {/* Alertas */}
      {resumen.alerts.length > 0 && (
        <Card className="animate-wizard-fade-in-up" style={{ animationDelay: "400ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumen.alerts.map((alert, index) => (
                <Alert
                  key={index}
                  className={cn(
                    "animate-wizard-fade-in-up",
                    alert.type === "warning" && "border-warning/50 bg-warning/10 text-warning-foreground [&>svg]:text-warning-foreground",
                    alert.type === "info" && "border-info/50 bg-info/10 text-info-foreground [&>svg]:text-info-foreground",
                    alert.type === "success" && "border-success/50 bg-success/10 text-success-foreground [&>svg]:text-success-foreground",
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {alert.type === "warning" && (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {alert.type === "info" && (
                    <Info className="h-4 w-4" />
                  )}
                  {alert.type === "success" && (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      {resumen.recommendations.length > 0 && (
        <Card className="animate-wizard-fade-in-up" style={{ animationDelay: "550ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resumen.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 py-1 hover:bg-muted/30 rounded-r-md transition-colors animate-wizard-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {resumen.insights.length > 0 && (
        <Card className="bg-muted/50 animate-wizard-fade-in-up" style={{ animationDelay: "600ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Datos Interesantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resumen.insights.map((insight, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 py-1 hover:bg-muted/30 rounded-r-md transition-colors animate-wizard-fade-in-up"
                  style={{ animationDelay: `${650 + index * 100}ms` }}
                >
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-center pt-4 animate-wizard-fade-in-up" style={{ animationDelay: "750ms" }}>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <TrendingUp className="mr-2 h-4 w-4" />
            Ir al Dashboard
          </Link>
        </Button>

        {resumen.ivaAPagar > 0 && (
          <Button asChild>
            <Link href="/modules/liquidacion">
              <Calculator className="mr-2 h-4 w-4" />
              Generar Liquidación
            </Link>
          </Button>
        )}

        <Button
          onClick={onNewImport}
          variant="outline"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Importación
        </Button>
      </div>
    </div>
  );
}
