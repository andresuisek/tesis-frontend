"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgentMessage } from "../agent-message";
import { ArrowLeft, ArrowRight, Upload, Check, AlertCircle, AlertTriangle, SkipForward, ChevronDown, Trash2 } from "lucide-react";
import { VentaParsed, VentasParseResult, TasaIVA } from "@/lib/ventas-parser";

const TASAS_IVA: TasaIVA[] = [0, 8, 12, 15];
import { cn } from "@/lib/utils";

interface StepVentasProps {
  ventas: {
    archivo: File | null;
    parsed: VentaParsed[];
    tasaIVA: TasaIVA;
    guardadas: boolean;
  };
  periodo: { mes: number; anio: number };
  contribuyenteRuc: string;
  onFileProcess: (file: File, tasaIVA: TasaIVA) => Promise<VentasParseResult>;
  onClear: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepVentas({
  ventas,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  periodo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contribuyenteRuc,
  onFileProcess,
  onClear,
  onNext,
  onBack,
}: StepVentasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasaIVA, setTasaIVA] = useState<TasaIVA>(ventas.tasaIVA);
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
      const result = await onFileProcess(file, tasaIVA);
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
    [tasaIVA]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Calcular totales
  const totalVentas = ventas.parsed.reduce((sum, v) => sum + v.subtotal, 0);
  const totalIVA = ventas.parsed.reduce((sum, v) => sum + v.iva, 0);

  const hasVentas = ventas.parsed.length > 0;

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage
        message={
          hasVentas
            ? `¡Excelente! He procesado ${ventas.parsed.length} ventas con un total de $${totalVentas.toFixed(2)}. El IVA generado es de $${totalIVA.toFixed(2)}. Puedes continuar al siguiente paso o cargar otro archivo si lo necesitas.`
            : "Primero, sube el archivo TXT de ventas que descargaste del portal del SRI. Este archivo contiene todas tus facturas emitidas del período seleccionado."
        }
        animate={!hasVentas}
      />

      {/* Selector de tasa IVA */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">
                Tasa de IVA del período
              </h4>
              <p className="text-sm text-muted-foreground">
                Selecciona la tasa de IVA vigente para este período
              </p>
            </div>
            <Select
              value={tasaIVA.toString()}
              onValueChange={(value) => setTasaIVA(parseInt(value) as TasaIVA)}
              disabled={hasVentas}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASAS_IVA.map((tasa) => (
                  <SelectItem key={tasa} value={tasa.toString()}>
                    {tasa}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <AlertTriangle className="inline h-3 w-3 mr-1" />
            Esta tasa se aplica a todas las ventas. Si tienes ventas con tarifa 0% y {tasaIVA}% en el mismo período, el cálculo de IVA será aproximado.
          </p>
        </CardContent>
      </Card>

      {/* Zona de carga */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          hasVentas && "border-primary/30 bg-primary/5",
          !isDragging && !hasVentas && "border-border hover:border-primary"
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

            {hasVentas ? (
              <>
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">
                    {ventas.archivo?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ventas.parsed.length} ventas procesadas • Click para cambiar archivo
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClear();
                    setError(null);
                    setParseWarnings([]);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar archivo
                </Button>
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
                    Formato: .TXT del portal SRI
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

      {/* Preview de ventas */}
      {hasVentas && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium text-foreground mb-4">
              Resumen de Ventas
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-primary/5">
                <p className="text-sm text-primary">
                  Total Facturas
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {ventas.parsed.length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5">
                <p className="text-sm text-primary">
                  Total Ventas
                </p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalVentas.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5">
                <p className="text-sm text-primary">
                  IVA Generado
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
          {!hasVentas && (
            <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
              <SkipForward className="mr-2 h-4 w-4" />
              Omitir
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!hasVentas}
          >
            Continuar a Notas de Crédito
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
