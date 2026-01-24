"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentMessage } from "../agent-message";
import { WizardState } from "../import-wizard";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  FileText,
  Info,
  Lightbulb,
  PlusCircle,
  ShoppingCart,
  TrendingUp,
  Receipt,
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

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Ventas</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ${resumen.ventasTotal.toFixed(2)}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  {resumen.ventasCount} documentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Compras</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  ${resumen.comprasTotal.toFixed(2)}
                </p>
                <p className="text-xs text-orange-500 dark:text-orange-400">
                  {resumen.comprasCount} documentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "bg-gradient-to-br border",
            resumen.ivaAPagar > 0
              ? "from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30 border-rose-200 dark:border-rose-800"
              : "from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800"
          )}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  resumen.ivaAPagar > 0 ? "bg-rose-500/20" : "bg-emerald-500/20"
                )}
              >
                <Calculator
                  className={cn(
                    "h-5 w-5",
                    resumen.ivaAPagar > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    resumen.ivaAPagar > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  IVA a Pagar
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    resumen.ivaAPagar > 0
                      ? "text-rose-900 dark:text-rose-100"
                      : "text-emerald-900 dark:text-emerald-100"
                  )}
                >
                  ${resumen.ivaAPagar.toFixed(2)}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    resumen.ivaAPagar > 0
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-emerald-500 dark:text-emerald-400"
                  )}
                >
                  {resumen.ivaAPagar > 0 ? "Por liquidar" : "Sin saldo a pagar"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/30 border-violet-200 dark:border-violet-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">Retenciones</p>
                <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">
                  ${resumen.retencionesTotal.toFixed(2)}
                </p>
                <p className="text-xs text-violet-500 dark:text-violet-400">
                  {resumen.retencionesCount} documentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalle IVA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Detalle de IVA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <p className="text-sm text-gray-600 dark:text-gray-400">IVA en Ventas</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                ${resumen.ivaVentas.toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-sm text-gray-600 dark:text-gray-400">Crédito Tributario</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                -${resumen.ivaCompras.toFixed(2)}
              </p>
            </div>
            <div
              className={cn(
                "p-4 rounded-lg",
                resumen.ivaAPagar > 0
                  ? "bg-rose-50 dark:bg-rose-950/30"
                  : "bg-gray-50 dark:bg-gray-800"
              )}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">Resultado</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  resumen.ivaAPagar > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                ${resumen.ivaAPagar.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {resumen.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumen.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg",
                    alert.type === "warning" &&
                      "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
                    alert.type === "info" &&
                      "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800",
                    alert.type === "success" &&
                      "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                  )}
                >
                  {alert.type === "warning" && (
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  )}
                  {alert.type === "info" && (
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                  {alert.type === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      alert.type === "warning" && "text-amber-700 dark:text-amber-300",
                      alert.type === "info" && "text-blue-700 dark:text-blue-300",
                      alert.type === "success" && "text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {alert.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      {resumen.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resumen.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-indigo-500 mt-1">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {resumen.insights.length > 0 && (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos Interesantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resumen.insights.map((insight, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-indigo-700 dark:text-indigo-300"
                >
                  <span className="text-indigo-400">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <TrendingUp className="mr-2 h-4 w-4" />
            Ir al Dashboard
          </Link>
        </Button>

        {resumen.ivaAPagar > 0 && (
          <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
            <Link href="/modules/liquidacion">
              <Calculator className="mr-2 h-4 w-4" />
              Generar Liquidación
            </Link>
          </Button>
        )}

        <Button
          onClick={onNewImport}
          variant="outline"
          className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Importación
        </Button>
      </div>
    </div>
  );
}

