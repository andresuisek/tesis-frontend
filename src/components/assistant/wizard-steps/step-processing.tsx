"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AgentMessage } from "../agent-message";
import { ProcessingIndicator } from "../wizard-navigation";
import { WizardState, ImportSummary } from "../import-wizard";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface StepProcessingProps {
  wizardState: WizardState;
  contribuyenteRuc: string;
  onVentasGuardadas: (guardadas: boolean) => void;
  onComprasGuardadas: (guardadas: boolean) => void;
  onRetencionesGuardadas: (guardadas: boolean, vinculadas: number) => void;
  onResumenReady: (resumen: ImportSummary) => void;
  onComplete: () => void;
}

type ProcessingStep = "idle" | "ventas" | "compras" | "retenciones" | "summary" | "complete";

export function StepProcessing({
  wizardState,
  contribuyenteRuc,
  onVentasGuardadas,
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
    const totalSteps = 4;
    let currentStep = 0;

    try {
      // Paso 1: Guardar ventas
      setCurrentProcessingStep("ventas");
      setMessage("Guardando ventas en la base de datos...");
      await guardarVentas();
      currentStep++;
      setProgress((currentStep / totalSteps) * 100);
      onVentasGuardadas(true);

      // Pequeña pausa para efecto visual
      await sleep(500);

      // Paso 2: Guardar compras
      setCurrentProcessingStep("compras");
      setMessage("Guardando compras y asignando rubros...");
      await guardarCompras();
      currentStep++;
      setProgress((currentStep / totalSteps) * 100);
      onComprasGuardadas(true);

      await sleep(500);

      // Paso 3: Guardar retenciones
      setCurrentProcessingStep("retenciones");
      setMessage("Guardando retenciones y vinculando con facturas...");
      const vinculadas = await guardarRetenciones();
      currentStep++;
      setProgress((currentStep / totalSteps) * 100);
      onRetencionesGuardadas(true, vinculadas);

      await sleep(500);

      // Paso 4: Generar resumen
      setCurrentProcessingStep("summary");
      setMessage("Generando resumen ejecutivo con alertas...");
      const resumen = await generarResumen(vinculadas);
      currentStep++;
      setProgress(100);
      onResumenReady(resumen);

      await sleep(800);

      // Completar
      setCurrentProcessingStep("complete");
      setMessage("¡Proceso completado exitosamente!");

      // Avanzar al siguiente paso automáticamente
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error("Error en procesamiento:", error);
      toast.error("Error durante el procesamiento. Por favor intenta de nuevo.");
    }
  };

  const guardarVentas = async () => {
    const { ventas, periodo } = wizardState;
    
    if (ventas.parsed.length === 0) return;

    // Preparar datos para inserción
    const ventasToInsert = ventas.parsed.map((v) => ({
      contribuyente_ruc: contribuyenteRuc,
      tipo_comprobante: v.tipo_comprobante,
      numero_comprobante: v.numero_comprobante,
      autorizacion: v.clave_acceso,
      fecha_emision: v.fecha_emision,
      cliente_ruc: v.ruc_cliente,
      cliente_razon_social: v.razon_social_cliente,
      subtotal: v.subtotal,
      iva: v.iva,
      total: v.total,
      tasa_iva: ventas.tasaIVA,
      periodo_mes: periodo.mes,
      periodo_anio: periodo.anio,
    }));

    // Insertar en batch
    const { error } = await supabase
      .from("ventas")
      .upsert(ventasToInsert, {
        onConflict: "contribuyente_ruc,numero_comprobante",
        ignoreDuplicates: true,
      });

    if (error) throw error;
  };

  const guardarCompras = async () => {
    const { compras, periodo } = wizardState;
    
    if (compras.parsed.length === 0) return;

    // Preparar datos para inserción
    const comprasToInsert = compras.parsed.map((c) => ({
      contribuyente_ruc: contribuyenteRuc,
      tipo_comprobante: c.tipo_comprobante,
      numero_comprobante: c.numero_comprobante,
      autorizacion: c.clave_acceso,
      fecha_emision: c.fecha_emision,
      proveedor_ruc: c.ruc_proveedor,
      proveedor_razon_social: c.razon_social_proveedor,
      subtotal: c.valor_sin_impuesto,
      iva: c.iva,
      total: c.total,
      rubro: c.rubro || "no_definido",
      periodo_mes: periodo.mes,
      periodo_anio: periodo.anio,
    }));

    // Insertar en batch
    const { error } = await supabase
      .from("compras")
      .upsert(comprasToInsert, {
        onConflict: "contribuyente_ruc,numero_comprobante",
        ignoreDuplicates: true,
      });

    if (error) throw error;
  };

  const guardarRetenciones = async (): Promise<number> => {
    const { retenciones, periodo } = wizardState;
    
    if (retenciones.parsed.length === 0) return 0;

    let vinculadas = 0;

    for (const retencion of retenciones.parsed) {
      // Calcular totales de retención
      const totalRetencionRenta = retencion.retencion_renta_valor || 0;
      const totalRetencionIVA = retencion.retencion_valor || 0;

      // Insertar retención
      const { error } = await supabase.from("retenciones").upsert(
        {
          contribuyente_ruc: contribuyenteRuc,
          numero_comprobante: retencion.serie_comprobante,
          fecha_emision: retencion.fecha_emision,
          agente_ruc: retencion.ruc_emisor || "",
          agente_razon_social: retencion.razon_social_emisor || "",
          sujeto_ruc: retencion.contribuyente_ruc,
          sujeto_razon_social: "",
          retencion_renta: totalRetencionRenta,
          retencion_iva: totalRetencionIVA,
          total_retenido: totalRetencionRenta + totalRetencionIVA,
          periodo_mes: periodo.mes,
          periodo_anio: periodo.anio,
        },
        {
          onConflict: "contribuyente_ruc,numero_comprobante",
          ignoreDuplicates: true,
        }
      );

      if (!error) {
        // Intentar vincular con factura de venta
        // Buscar venta con el mismo cliente
        const { data: ventaVinculada } = await supabase
          .from("ventas")
          .select("id")
          .eq("contribuyente_ruc", contribuyenteRuc)
          .eq("cliente_ruc", retencion.ruc_emisor || "")
          .eq("periodo_mes", periodo.mes)
          .eq("periodo_anio", periodo.anio)
          .limit(1)
          .single();

        if (ventaVinculada) {
          vinculadas++;
        }
      }
    }

    return vinculadas;
  };

  const generarResumen = async (vinculadas: number): Promise<ImportSummary> => {
    const { ventas, compras, retenciones } = wizardState;

    // Calcular totales
    const ventasTotal = ventas.parsed.reduce((sum, v) => sum + v.total, 0);
    const ivaVentas = ventas.parsed.reduce((sum, v) => sum + v.iva, 0);

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

    // Calcular IVA a pagar
    const ivaAPagar = Math.max(0, ivaVentas - ivaCompras - totalRetencionesIVA);

    // Generar alertas
    const alerts: ImportSummary["alerts"] = [];
    const recommendations: string[] = [];
    const insights: string[] = [];

    // Alerta de IVA
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

    // Alerta de retenciones
    const facturasConRetenciones = vinculadas;
    const facturasSinRetencion = ventas.parsed.length - facturasConRetenciones;
    
    if (facturasSinRetencion > 0 && facturasSinRetencion < ventas.parsed.length) {
      alerts.push({
        type: "info",
        icon: "info",
        message: `${facturasSinRetencion} facturas de venta aún no tienen retención asociada`,
      });
    }

    // Alerta de rubros
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

    // Insights
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

    // Intentar obtener alertas de IA si hay API disponible
    try {
      const response = await fetch("/api/ai-agent/import-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contribuyenteRuc,
          periodo: wizardState.periodo,
          ventasTotal,
          ventasCount: ventas.parsed.length,
          comprasTotal,
          comprasCount: compras.parsed.length,
          ivaVentas,
          ivaCompras,
          retencionesTotal: totalRetencionesRenta + totalRetencionesIVA,
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
      // Silently fail - usar alertas locales
      console.log("AI summary not available, using local alerts");
    }

    return {
      ventasTotal,
      ventasCount: ventas.parsed.length,
      comprasTotal,
      comprasCount: compras.parsed.length,
      ivaVentas,
      ivaCompras,
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

  const isStepComplete = (step: ProcessingStep) => {
    const stepOrder: ProcessingStep[] = ["ventas", "compras", "retenciones", "summary"];
    const currentIndex = stepOrder.indexOf(currentProcessingStep);
    const stepIndex = stepOrder.indexOf(step);
    return stepIndex < currentIndex;
  };

  const isStepActive = (step: ProcessingStep) => currentProcessingStep === step;

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage message={message} animate={false} />

      {/* Progreso */}
      <Card className="border-2 border-blue-100 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardContent className="pt-6">
          {/* Barra de progreso */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Progreso</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Indicadores de proceso */}
          <div className="space-y-1 border-t border-blue-100 dark:border-blue-800 pt-4">
            <ProcessingIndicator
              label={`Ventas guardadas (${wizardState.ventas.parsed.length})`}
              isComplete={isStepComplete("ventas")}
              isActive={isStepActive("ventas")}
            />
            <ProcessingIndicator
              label={`Compras guardadas (${wizardState.compras.parsed.length})`}
              isComplete={isStepComplete("compras")}
              isActive={isStepActive("compras")}
            />
            <ProcessingIndicator
              label={`Retenciones procesadas (${wizardState.retenciones.parsed.length})`}
              isComplete={isStepComplete("retenciones")}
              isActive={isStepActive("retenciones")}
            />
            <ProcessingIndicator
              label="Generando resumen ejecutivo"
              isComplete={isStepComplete("summary") || currentProcessingStep === "complete"}
              isActive={isStepActive("summary")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Animación central */}
      {currentProcessingStep !== "complete" && (
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse" />
            <div className="absolute inset-0 h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-ping opacity-25" />
          </div>
        </div>
      )}

      {currentProcessingStep === "complete" && (
        <div className="flex justify-center py-8">
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center">
            <svg
              className="h-10 w-10 text-white"
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

