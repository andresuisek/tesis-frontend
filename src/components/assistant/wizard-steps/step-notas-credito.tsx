"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgentMessage } from "../agent-message";
import { ArrowLeft, ArrowRight, Upload, Check, AlertCircle, AlertTriangle, SkipForward, ChevronDown } from "lucide-react";
import { NotaCreditoParsed, NotasCreditoParseResult } from "@/lib/notas-credito-parser";
import { cn } from "@/lib/utils";

interface StepNotasCreditoProps {
  notasCredito: {
    archivo: File | null;
    parsed: NotaCreditoParsed[];
    guardadas: boolean;
  };
  periodo: { mes: number; anio: number };
  contribuyenteRuc: string;
  onFileProcess: (file: File) => Promise<NotasCreditoParseResult>;
  onNext: () => void;
  onBack: () => void;
}

export function StepNotasCredito({
  notasCredito,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  periodo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contribuyenteRuc,
  onFileProcess,
  onNext,
  onBack,
}: StepNotasCreditoProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [warningsOpen, setWarningsOpen] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".TXT")) {
      setError("Por favor selecciona un archivo TXT del SRI");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setParseWarnings([]);
    setSkippedCount(0);

    try {
      const result = await onFileProcess(file);
      if (result.warnings.length > 0) {
        setParseWarnings(result.warnings);
        setSkippedCount(result.skippedCount);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar el archivo. Verifica que sea el formato correcto del SRI.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        await processFile(file);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Calcular totales
  const totalMonto = notasCredito.parsed.reduce((sum, nc) => sum + nc.total, 0);
  const totalIVA = notasCredito.parsed.reduce((sum, nc) => sum + nc.iva, 0);

  const hasNotasCredito = notasCredito.parsed.length > 0;

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage
        message={
          hasNotasCredito
            ? `He procesado ${notasCredito.parsed.length} notas de crédito por un total de $${totalMonto.toFixed(2)}. El IVA asociado es de $${totalIVA.toFixed(2)}. Puedes continuar o cargar otro archivo.`
            : "Si emitiste notas de crédito en este período, sube el archivo TXT del SRI. Las notas de crédito reducen el IVA en ventas de tu declaración."
        }
        animate={!hasNotasCredito}
      />

      {/* Zona de carga */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          hasNotasCredito && "border-primary/30 bg-primary/5",
          !isDragging && !hasNotasCredito && "border-border hover:border-primary"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-12">
          <label className="flex flex-col items-center gap-4 cursor-pointer">
            <input
              type="file"
              accept=".txt,.TXT"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />

            {hasNotasCredito ? (
              <>
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">
                    {notasCredito.archivo?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notasCredito.parsed.length} notas de crédito procesadas • Click para cambiar archivo
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                    isDragging
                      ? "bg-primary/10"
                      : "bg-muted"
                  )}
                >
                  {isProcessing ? (
                    <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload
                      className={cn(
                        "h-8 w-8",
                        isDragging
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">
                    {isProcessing
                      ? "Procesando archivo..."
                      : isDragging
                      ? "Suelta el archivo aquí"
                      : "Arrastra tu archivo aquí o haz clic"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formato: .TXT del portal SRI (Notas de Crédito emitidas)
                  </p>
                </div>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview de notas de crédito */}
      {hasNotasCredito && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium text-foreground mb-4">
              Resumen de Notas de Crédito
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-primary/5">
                <p className="text-sm text-primary">
                  Total Notas
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {notasCredito.parsed.length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5">
                <p className="text-sm text-primary">
                  Total Monto
                </p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalMonto.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5">
                <p className="text-sm text-primary">
                  IVA
                </p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalIVA.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings del parseo */}
      {parseWarnings.length > 0 && (
        <Collapsible open={warningsOpen} onOpenChange={setWarningsOpen}>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {skippedCount > 0
                ? `${skippedCount} registros omitidos por datos inválidos`
                : `${parseWarnings.length} advertencias durante el parseo`}
            </AlertTitle>
            <AlertDescription>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs hover:underline cursor-pointer mt-1">
                Ver detalle
                <ChevronDown className={cn("h-3 w-3 transition-transform", warningsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs">
                  {parseWarnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </CollapsibleContent>
            </AlertDescription>
          </Alert>
        </Collapsible>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <div className="flex gap-2">
          {!hasNotasCredito && (
            <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
              <SkipForward className="mr-2 h-4 w-4" />
              Omitir
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!hasNotasCredito}
          >
            Continuar a Retenciones
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
