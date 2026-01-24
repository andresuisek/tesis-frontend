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
import { AgentMessage } from "../agent-message";
import { ArrowLeft, ArrowRight, Upload, Check, AlertCircle } from "lucide-react";
import { VentaParsed, TasaIVA } from "@/lib/ventas-parser";

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
  onFileProcess: (file: File, tasaIVA: TasaIVA) => Promise<VentaParsed[]>;
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
  onNext,
  onBack,
}: StepVentasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasaIVA, setTasaIVA] = useState<TasaIVA>(ventas.tasaIVA);
  const [error, setError] = useState<string | null>(null);

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

    try {
      await onFileProcess(file, tasaIVA);
    } catch {
      setError("Error al procesar el archivo. Verifica que sea el formato correcto del SRI.");
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
      <Card className="border border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Tasa de IVA del período
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
        </CardContent>
      </Card>

      {/* Zona de carga */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging && "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
          hasVentas && "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700",
          !isDragging && !hasVentas && "border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600"
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
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    {ventas.archivo?.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {ventas.parsed.length} ventas procesadas • Click para cambiar archivo
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                    isDragging
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "bg-gray-100 dark:bg-gray-800"
                  )}
                >
                  {isProcessing ? (
                    <div className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload
                      className={cn(
                        "h-8 w-8",
                        isDragging
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-400"
                      )}
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {isProcessing
                      ? "Procesando archivo..."
                      : isDragging
                      ? "Suelta el archivo aquí"
                      : "Arrastra tu archivo aquí o haz clic"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Preview de ventas */}
      {hasVentas && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Resumen de Ventas
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Total Facturas
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {ventas.parsed.length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Total Ventas
                </p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  ${totalVentas.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800">
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  IVA Generado
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  ${totalIVA.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          onClick={onNext}
          disabled={!hasVentas}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          Continuar a Compras
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

