"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AgentMessage } from "../agent-message";
import { ProcessingIndicator } from "../wizard-navigation";
import { WizardState, ImportSummary } from "../import-wizard";
import { toast } from "sonner";

interface StepProcessingProps {
  wizardState: WizardState;
  contribuyenteRuc: string;
  onVentasGuardadas: (guardadas: boolean) => void;
  onNotasCreditoGuardadas: (guardadas: boolean) => void;
  onComprasGuardadas: (guardadas: boolean) => void;
  onRetencionesGuardadas: (guardadas: boolean, vinculadas: number) => void;
  onResumenReady: (resumen: ImportSummary) => void;
  onComplete: () => void;
}

type ProcessingStep = "idle" | "saving" | "saved" | "summary" | "complete";

export function StepProcessing({
  wizardState,
  contribuyenteRuc,
  onVentasGuardadas,
  onNotasCreditoGuardadas,
  onComprasGuardadas,
  onRetencionesGuardadas,
  onResumenReady,
  onComplete,
}: StepProcessingProps) {
  const [currentProcessingStep, setCurrentProcessingStep] = useState<ProcessingStep>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Preparando para procesar tu información...");
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    processAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processAll = async () => {
    try {
      // Paso 1: Guardar todo en una sola transacción atómica
      setCurrentProcessingStep("saving");
      setMessage("Guardando ventas, notas de crédito, compras y retenciones...");
      setProgress(10);

      const result = await guardarTodo();

      // Marcar todo como guardado
      setProgress(60);
      setCurrentProcessingStep("saved");
      onVentasGuardadas(true);
      onNotasCreditoGuardadas(true);
      onComprasGuardadas(true);
      onRetencionesGuardadas(true, result.retenciones_vinculadas);

      await sleep(500);

      // Paso 2: Generar resumen
      setCurrentProcessingStep("summary");
      setMessage("Generando resumen ejecutivo con alertas...");
      setProgress(75);

      const resumen = await generarResumen(result.retenciones_vinculadas);
      setProgress(100);
      onResumenReady(resumen);

      await sleep(800);

      // Completar
      setCurrentProcessingStep("complete");
      setMessage("¡Proceso completado exitosamente!");

      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error("Error en procesamiento:", error);
      const msg = error instanceof Error ? error.message : "Error durante el procesamiento.";
      toast.error(msg);
    }
  };

  interface ImportResult {
    ventas_inserted: number;
    notas_credito_inserted: number;
    compras_inserted: number;
    retenciones_inserted: number;
    retenciones_vinculadas: number;
  }

  const guardarTodo = async (): Promise<ImportResult> => {
    const { ventas, notasCredito, compras, retenciones } = wizardState;

    const response = await fetch("/api/import/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contribuyenteRuc,
        ventas: ventas.parsed,
        notasCredito: notasCredito.parsed,
        compras: compras.parsed,
        retenciones: retenciones.parsed,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Error al guardar los datos.");
    }

    return response.json();
  };

  const generarResumen = async (vinculadas: number): Promise<ImportSummary> => {
    const { ventas, notasCredito, compras, retenciones } = wizardState;

    // Calcular totales
    const ventasTotal = ventas.parsed.reduce((sum, v) => sum + v.total, 0);
    const ivaVentas = ventas.parsed.reduce((sum, v) => sum + v.iva, 0);

    const notasCreditoTotal = notasCredito.parsed.reduce((sum, nc) => sum + nc.total, 0);
    const ivaNotasCredito = notasCredito.parsed.reduce((sum, nc) => sum + nc.iva, 0);

    const comprasTotal = compras.parsed.reduce((sum, c) => sum + c.total, 0);
    const ivaCompras = compras.parsed.reduce((sum, c) => sum + c.iva, 0);

    const totalRetencionesRenta = retenciones.parsed.reduce(
      (sum, r) => sum + (r.retencion_renta_valor || 0),
      0
    );
    const totalRetencionesIVA = retenciones.parsed.reduce(
      (sum, r) => sum + (r.retencion_valor || 0),
      0
    );

    // IVA a pagar: IVA ventas - IVA NC - crédito tributario (compras) - retenciones IVA
    const ivaAPagar = Math.max(0, ivaVentas - ivaNotasCredito - ivaCompras - totalRetencionesIVA);

    // Generar alertas locales
    const alerts: ImportSummary["alerts"] = [];
    const recommendations: string[] = [];
    const insights: string[] = [];

    if (ivaAPagar > 0) {
      alerts.push({
        type: "warning",
        icon: "alert",
        message: `Tienes $${ivaAPagar.toFixed(2)} de IVA por pagar este período`,
      });
      recommendations.push("Genera la liquidación del mes antes del vencimiento");
    } else if (ivaAPagar === 0 && ivaVentas > 0) {
      alerts.push({
        type: "success",
        icon: "check",
        message: "Tu crédito tributario cubre el IVA generado",
      });
    }

    const facturasConRetenciones = vinculadas;
    const facturasSinRetencion = ventas.parsed.length - facturasConRetenciones;

    if (facturasSinRetencion > 0 && facturasSinRetencion < ventas.parsed.length) {
      alerts.push({
        type: "info",
        icon: "info",
        message: `${facturasSinRetencion} facturas de venta aún no tienen retención asociada`,
      });
    }

    if (notasCredito.parsed.length > 0) {
      alerts.push({
        type: "info",
        icon: "info",
        message: `${notasCredito.parsed.length} notas de crédito reducen el IVA en ventas por $${ivaNotasCredito.toFixed(2)}`,
      });
    }

    const proveedoresSinRubro = compras.proveedores.filter(
      (p) => !p.rubro || p.rubro === "no_definido"
    ).length;

    if (proveedoresSinRubro > 0) {
      alerts.push({
        type: "info",
        icon: "building",
        message: `${proveedoresSinRubro} proveedores necesitan asignación de rubro`,
      });
      recommendations.push("Revisa los rubros de los proveedores para maximizar deducciones");
    }

    if (ventas.parsed.length > 0) {
      const promedioVenta = ventasTotal / ventas.parsed.length;
      insights.push(`Promedio por venta: $${promedioVenta.toFixed(2)}`);
    }

    if (compras.parsed.length > 0) {
      const comprasProfesionales = compras.parsed.filter(
        (c) => c.rubro === "actividad_profesional"
      );
      const porcentajeProfesional = (comprasProfesionales.length / compras.parsed.length) * 100;
      if (porcentajeProfesional > 0) {
        insights.push(`${porcentajeProfesional.toFixed(0)}% de tus compras son de actividad profesional`);
      }
    }

    // Intentar obtener alertas de IA
    try {
      const response = await fetch("/api/ai-agent/import-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contribuyenteRuc,
          periodo: wizardState.periodo,
          ventasTotal,
          ventasCount: ventas.parsed.length,
          notasCreditoTotal,
          notasCreditoCount: notasCredito.parsed.length,
          comprasTotal,
          comprasCount: compras.parsed.length,
          ivaVentas,
          ivaCompras,
          ivaNotasCredito,
          retencionesTotal: totalRetencionesRenta + totalRetencionesIVA,
          retencionIVA: totalRetencionesIVA,
          retencionRenta: totalRetencionesRenta,
          facturasSinRetencion,
          proveedoresSinRubro,
        }),
      });

      if (response.ok) {
        const aiData = await response.json();
        if (aiData.alerts) alerts.push(...aiData.alerts);
        if (aiData.recommendations) recommendations.push(...aiData.recommendations);
        if (aiData.insights) insights.push(...aiData.insights);
      }
    } catch {
      console.log("AI summary not available, using local alerts");
    }

    return {
      ventasTotal,
      ventasCount: ventas.parsed.length,
      notasCreditoTotal,
      notasCreditoCount: notasCredito.parsed.length,
      comprasTotal,
      comprasCount: compras.parsed.length,
      ivaVentas,
      ivaCompras,
      ivaNotasCredito,
      ivaAPagar,
      retencionesTotal: totalRetencionesRenta + totalRetencionesIVA,
      retencionesCount: retenciones.parsed.length,
      facturasConRetencion: facturasConRetenciones,
      alerts,
      recommendations,
      insights,
    };
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const isSaved = currentProcessingStep === "saved" || currentProcessingStep === "summary" || currentProcessingStep === "complete";

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage message={message} animate={false} />

      {/* Progreso */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          {/* Barra de progreso */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Indicadores de proceso */}
          <div className="space-y-1 border-t border-primary/10 pt-4">
            <ProcessingIndicator
              label={`Ventas guardadas (${wizardState.ventas.parsed.length})`}
              isComplete={isSaved}
              isActive={currentProcessingStep === "saving"}
            />
            <ProcessingIndicator
              label={`Notas de crédito guardadas (${wizardState.notasCredito.parsed.length})`}
              isComplete={isSaved}
              isActive={currentProcessingStep === "saving"}
            />
            <ProcessingIndicator
              label={`Compras guardadas (${wizardState.compras.parsed.length})`}
              isComplete={isSaved}
              isActive={currentProcessingStep === "saving"}
            />
            <ProcessingIndicator
              label={`Retenciones procesadas (${wizardState.retenciones.parsed.length})`}
              isComplete={isSaved}
              isActive={currentProcessingStep === "saving"}
            />
            <ProcessingIndicator
              label="Generando resumen ejecutivo"
              isComplete={currentProcessingStep === "complete"}
              isActive={currentProcessingStep === "summary"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Animación central */}
      {currentProcessingStep !== "complete" && (
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary animate-pulse" />
            <div className="absolute inset-0 h-20 w-20 rounded-full bg-primary animate-ping opacity-25" />
          </div>
        </div>
      )}

      {currentProcessingStep === "complete" && (
        <div className="flex justify-center py-8">
          <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center">
            <svg
              className="h-10 w-10 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
