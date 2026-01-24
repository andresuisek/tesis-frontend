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
import { AgentMessage } from "../agent-message";
import { ArrowLeft, Upload, Check, AlertCircle, FileText, X, Play } from "lucide-react";
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
          isDragging && "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
          hasRetenciones && "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700",
          !isDragging && !hasRetenciones && "border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600"
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
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    {retenciones.parsed.length} retenciones procesadas
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Click para agregar más archivos
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
                    isDragging ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"
                  )}
                >
                  {isProcessing ? (
                    <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload
                      className={cn(
                        "h-6 w-6",
                        isDragging ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
                      )}
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {isProcessing
                      ? "Procesando archivos..."
                      : isDragging
                      ? "Suelta los archivos aquí"
                      : "Arrastra los XML de retenciones aquí"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Archivos pendientes */}
      {hasPendingFiles && !hasRetenciones && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Archivos Listos ({pendingFiles.length})
              </h4>
              <Button
                size="sm"
                onClick={processAllFiles}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[300px]">
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
            <Card className="bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-rose-600 dark:text-rose-400">Total Retenciones</p>
                <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                  {retenciones.parsed.length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">Retención Renta</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  ${totalRetencionRenta.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-cyan-600 dark:text-cyan-400">Retención IVA</p>
                <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                  ${totalRetencionIVA.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de retenciones */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Detalle de Retenciones
              </h4>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-900">
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
        <Button
          onClick={onNext}
          disabled={!hasRetenciones && !hasPendingFiles}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
        >
          <Play className="mr-2 h-4 w-4" />
          Procesar Todo
        </Button>
      </div>
    </div>
  );
}

