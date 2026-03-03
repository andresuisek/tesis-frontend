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
import { Progress } from "@/components/ui/progress";
import { AgentMessage } from "../agent-message";
import { ArrowLeft, ArrowRight, Upload, Check, AlertCircle, AlertTriangle, SkipForward, ChevronDown, Trash2, FileText, DollarSign, Calculator } from "lucide-react";
import { VentaParsed } from "@/lib/ventas-parser";
import { VentaXmlParsed, VentasXMLParseResult } from "@/lib/ventas-xml-parser";
import { cn } from "@/lib/utils";

interface StepVentasProps {
  ventas: {
    formato: "txt" | "xml";
    archivo: File | null;
    archivosXml: File[];
    parsed: VentaParsed[];
    parsedXml: VentaXmlParsed[];
    tasaIVA: number;
    guardadas: boolean;
  };
  periodo: { mes: number; anio: number };
  contribuyenteRuc: string;
  onXmlFilesProcess: (files: File[], onProgress?: (percent: number) => void) => Promise<VentasXMLParseResult>;
  onClear: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepVentas({
  ventas,
  onXmlFilesProcess,
  onClear,
  onNext,
  onBack,
}: StepVentasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);

  // XML-specific state
  const [xmlProgress, setXmlProgress] = useState(0);
  const [xmlParseResult, setXmlParseResult] = useState<VentasXMLParseResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processXmlFiles = async (files: File[]) => {
    const xmlFiles = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith(".xml")
    );
    if (xmlFiles.length === 0) {
      setError("No se encontraron archivos XML válidos");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setXmlProgress(0);
    setXmlParseResult(null);

    try {
      const result = await onXmlFilesProcess(xmlFiles, (percent) => {
        setXmlProgress(percent);
      });
      setXmlParseResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar los archivos XML.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await processXmlFiles(Array.from(e.dataTransfer.files));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processXmlFiles(Array.from(files));
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
            ? `He procesado ${ventas.parsed.length} ventas con un total de $${totalVentas.toFixed(2)}. El IVA generado es de $${totalIVA.toFixed(2)}. Puedes continuar al siguiente paso o cargar otros archivos si lo necesitas.`
            : "Selecciona los archivos XML de facturas electrónicas emitidas. Puedes arrastrar múltiples archivos a la vez."
        }
        animate={!hasVentas}
      />

      {/* Zona de carga */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging && "border-primary bg-primary/5 scale-[1.02] shadow-lg",
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
              accept=".xml,.XML"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />

            {hasVentas ? (
              <>
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-wizard-check-bounce">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">
                    {ventas.archivosXml.length} archivos XML procesados
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ventas.parsed.length} ventas procesadas • Click para cambiar
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
                    setXmlParseResult(null);
                    setXmlProgress(0);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar archivos
                </Button>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                    isDragging ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  {isProcessing ? (
                    <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload
                      className={cn(
                        "h-8 w-8 transition-transform",
                        isDragging ? "text-primary animate-bounce" : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">
                    {isProcessing
                      ? "Procesando archivos..."
                      : isDragging
                      ? "Suelta los archivos aquí"
                      : "Arrastra tus facturas XML aquí o haz clic"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formato: .XML (facturas electrónicas) — puedes seleccionar múltiples
                  </p>
                </div>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      {/* Barra de progreso XML */}
      {isProcessing && (
        <div className="space-y-2">
          <Progress value={xmlProgress} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Parseando archivos XML...</span>
            <span>{Math.round(xmlProgress)}%</span>
          </div>
        </div>
      )}

      {/* Resumen de parseo XML */}
      {xmlParseResult && !isProcessing && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Parseadas correctamente</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {xmlParseResult.ventas.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Errores</p>
            <p className="text-2xl font-bold text-destructive">
              {xmlParseResult.errores.length - xmlParseResult.skipped}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Omitidas (no autorizadas)</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {xmlParseResult.skipped}
            </p>
          </div>
        </div>
      )}

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
              <div
                className="p-4 rounded-lg bg-primary/5 flex items-center gap-3 animate-wizard-fade-in-up"
                style={{ animationDelay: "0ms" }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-primary">
                    Total Facturas
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {ventas.parsed.length}
                  </p>
                </div>
              </div>
              <div
                className="p-4 rounded-lg bg-primary/5 flex items-center gap-3 animate-wizard-fade-in-up"
                style={{ animationDelay: "100ms" }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-primary">
                    Total Ventas
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalVentas.toFixed(2)}
                  </p>
                </div>
              </div>
              <div
                className="p-4 rounded-lg bg-primary/5 flex items-center gap-3 animate-wizard-fade-in-up"
                style={{ animationDelay: "200ms" }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-primary">
                    IVA Generado
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalIVA.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* XML errors collapsible */}
      {xmlParseResult && xmlParseResult.errores.length > 0 && (
        <Collapsible open={warningsOpen} onOpenChange={setWarningsOpen}>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {xmlParseResult.errores.length} archivos con problemas
            </AlertTitle>
            <AlertDescription>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs hover:underline cursor-pointer mt-1">
                Ver detalle
                <ChevronDown className={cn("h-3 w-3 transition-transform", warningsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs">
                  {xmlParseResult.errores.map((e, i) => (
                    <li key={i}>• {e}</li>
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
