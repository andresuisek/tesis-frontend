"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AgentMessage } from "../agent-message";
import { ArrowLeft, ArrowRight, Upload, Check, AlertCircle, FileText, X, Play, SkipForward, Trash2 } from "lucide-react";
import { RetencionParsed } from "@/lib/retencion-xml-parser";
import { cn } from "@/lib/utils";

interface StepRetencionesProps {
  retenciones: {
    archivos: File[];
    parsed: RetencionParsed[];
    guardadas: boolean;
    vinculadas: number;
  };
  periodo: { mes: number; anio: number };
  contribuyenteRuc: string;
  onFilesProcess: (files: File[]) => Promise<RetencionParsed[]>;
  onClear: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepRetenciones({
  retenciones,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  periodo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contribuyenteRuc,
  onFilesProcess,
  onClear,
  onNext,
  onBack,
}: StepRetencionesProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const addFiles = async (files: File[]) => {
    const xmlFiles = files.filter(
      (f) => f.name.endsWith(".xml") || f.name.endsWith(".XML")
    );

    if (xmlFiles.length === 0) {
      setError("Por favor selecciona archivos XML de retenciones");
      return;
    }

    setError(null);

    // Si ya hay retenciones procesadas, agregar a las existentes
    if (retenciones.parsed.length > 0) {
      const allFiles = [...retenciones.archivos, ...xmlFiles];
      setIsProcessing(true);
      try {
        await onFilesProcess(allFiles);
      } catch {
        setError("Error al procesar algunos archivos XML");
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Agregar a pendientes
      setPendingFiles((prev) => [...prev, ...xmlFiles]);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await addFiles(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await addFiles(files);
    }
    // Reset input
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processAllFiles = async () => {
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      await onFilesProcess(pendingFiles);
      setPendingFiles([]);
    } catch {
      setError("Error al procesar los archivos XML");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular totales
  const totalRetencionRenta = retenciones.parsed.reduce(
    (sum, r) => sum + (r.retencion_renta_valor || 0),
    0
  );
  const totalRetencionIVA = retenciones.parsed.reduce(
    (sum, r) => sum + (r.retencion_valor || 0),
    0
  );

  const hasRetenciones = retenciones.parsed.length > 0;
  const hasPendingFiles = pendingFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage
        message={
          hasRetenciones
            ? `He procesado ${retenciones.parsed.length} retenciones. Total retenido: $${(totalRetencionRenta + totalRetencionIVA).toFixed(2)} (Renta: $${totalRetencionRenta.toFixed(2)}, IVA: $${totalRetencionIVA.toFixed(2)}). Puedes agregar más archivos o proceder al resumen.`
            : hasPendingFiles
            ? `Tienes ${pendingFiles.length} archivos listos para procesar. Haz clic en "Procesar Archivos" cuando estés listo.`
            : "Por último, sube los archivos XML de las retenciones que te han realizado. Puedes arrastrar varios archivos a la vez."
        }
        animate={!hasRetenciones && !hasPendingFiles}
      />

      {/* Zona de carga */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          hasRetenciones && "border-primary/30 bg-primary/5",
          !isDragging && !hasRetenciones && "border-border hover:border-primary"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-8">
          <label className="flex flex-col items-center gap-4 cursor-pointer">
            <input
              type="file"
              accept=".xml,.XML"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />

            {hasRetenciones ? (
              <>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">
                    {retenciones.parsed.length} retenciones procesadas
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click para agregar más archivos
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
                    setPendingFiles([]);
                    setError(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar retenciones
                </Button>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
                    isDragging ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  {isProcessing ? (
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload
                      className={cn(
                        "h-6 w-6",
                        isDragging ? "text-primary" : "text-muted-foreground"
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
                      : "Arrastra los XML de retenciones aquí"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Múltiples archivos permitidos • Formato .XML
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

      {/* Archivos pendientes */}
      {hasPendingFiles && !hasRetenciones && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-foreground">
                Archivos Listos ({pendingFiles.length})
              </h4>
              <Button
                size="sm"
                onClick={processAllFiles}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Procesar Archivos
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate max-w-[300px]">
                      {file.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview de retenciones */}
      {hasRetenciones && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-primary">Total Retenciones</p>
                <p className="text-2xl font-bold text-foreground">
                  {retenciones.parsed.length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-primary">Retención Renta</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalRetencionRenta.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-primary">Retención IVA</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalRetencionIVA.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de retenciones */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium text-foreground mb-4">
                Detalle de Retenciones
              </h4>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Sujeto Retenido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total Retenido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retenciones.parsed.map((retencion, index) => {
                      const totalRetenido = (retencion.retencion_renta_valor || 0) + (retencion.retencion_valor || 0);
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">
                            {retencion.serie_comprobante}
                          </TableCell>
                          <TableCell className="truncate max-w-[200px]">
                            {retencion.razon_social_emisor || "N/A"}
                          </TableCell>
                          <TableCell>{retencion.fecha_emision}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${totalRetenido.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <div className="flex gap-2">
          {!hasRetenciones && !hasPendingFiles && (
            <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
              <SkipForward className="mr-2 h-4 w-4" />
              Omitir retenciones
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!hasRetenciones && !hasPendingFiles}
          >
            Continuar a Compras
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
