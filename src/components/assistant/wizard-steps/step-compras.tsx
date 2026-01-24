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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AgentMessage } from "../agent-message";
import { ArrowLeft, ArrowRight, Upload, Check, AlertCircle, Building2 } from "lucide-react";
import { CompraParsed, ProveedorResumen } from "@/lib/compras-parser";
import { cn } from "@/lib/utils";

interface StepComprasProps {
  compras: {
    archivo: File | null;
    parsed: CompraParsed[];
    proveedores: ProveedorResumen[];
    guardadas: boolean;
  };
  periodo: { mes: number; anio: number };
  contribuyenteRuc: string;
  onFileProcess: (file: File) => Promise<{ compras: CompraParsed[]; proveedores: ProveedorResumen[] }>;
  onRubroChange: (ruc: string, rubro: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const RUBROS_DISPONIBLES = [
  { value: "actividad_profesional", label: "Actividad Profesional" },
  { value: "alimentacion", label: "Alimentación" },
  { value: "vestimenta", label: "Vestimenta" },
  { value: "vivienda", label: "Vivienda" },
  { value: "salud", label: "Salud" },
  { value: "educacion", label: "Educación" },
  { value: "turismo", label: "Turismo" },
  { value: "no_definido", label: "No definido / Otro" },
];

export function StepCompras({
  compras,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  periodo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contribuyenteRuc,
  onFileProcess,
  onRubroChange,
  onNext,
  onBack,
}: StepComprasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
      await onFileProcess(file);
    } catch {
      setError("Error al procesar el archivo. Verifica que sea el formato correcto del SRI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Calcular totales
  const totalCompras = compras.parsed.reduce((sum, c) => sum + c.valor_sin_impuesto, 0);
  const totalIVA = compras.parsed.reduce((sum, c) => sum + c.iva, 0);
  const proveedoresSinRubro = compras.proveedores.filter(
    (p) => !p.rubro || p.rubro === "no_definido"
  ).length;

  const hasCompras = compras.parsed.length > 0;

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage
        message={
          hasCompras
            ? proveedoresSinRubro > 0
              ? `He procesado ${compras.parsed.length} compras de ${compras.proveedores.length} proveedores. Por favor asigna un rubro a cada proveedor para clasificar correctamente los gastos. Faltan ${proveedoresSinRubro} por asignar.`
              : `¡Perfecto! He procesado ${compras.parsed.length} compras con un total de $${totalCompras.toFixed(2)}. Todos los proveedores tienen un rubro asignado. Puedes continuar al siguiente paso.`
            : "Ahora necesito el archivo TXT de compras del SRI. Este archivo contiene todas las facturas que has recibido de tus proveedores durante el período."
        }
        animate={!hasCompras}
      />

      {/* Zona de carga */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging && "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
          hasCompras && "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700",
          !isDragging && !hasCompras && "border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-8">
          <label className="flex flex-col items-center gap-4 cursor-pointer">
            <input
              type="file"
              accept=".txt,.TXT"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />

            {hasCompras ? (
              <>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    {compras.archivo?.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {compras.parsed.length} compras • {compras.proveedores.length} proveedores • Click para cambiar
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
                      ? "Procesando archivo..."
                      : isDragging
                      ? "Suelta el archivo aquí"
                      : "Arrastra tu archivo de compras aquí"}
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

      {/* Preview de compras */}
      {hasCompras && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-orange-600 dark:text-orange-400">Total Compras</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {compras.parsed.length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-teal-600 dark:text-teal-400">Total Monto</p>
                <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                  ${totalCompras.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-violet-600 dark:text-violet-400">Crédito Tributario</p>
                <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">
                  ${totalIVA.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de proveedores con rubros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-5 w-5 text-gray-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Asignar Rubros a Proveedores
                </h4>
                {proveedoresSinRubro > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full">
                    {proveedoresSinRubro} pendientes
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="w-[120px]">RUC</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right w-[100px]">Compras</TableHead>
                      <TableHead className="text-right w-[120px]">Total</TableHead>
                      <TableHead className="w-[200px]">Rubro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.proveedores.map((proveedor) => (
                      <TableRow key={proveedor.ruc_proveedor}>
                        <TableCell className="font-mono text-xs">
                          {proveedor.ruc_proveedor}
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]">
                          {proveedor.razon_social_proveedor}
                        </TableCell>
                        <TableCell className="text-right">
                          {proveedor.cantidad_compras}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${proveedor.total_compras.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={proveedor.rubro || ""}
                            onValueChange={(value) => onRubroChange(proveedor.ruc_proveedor, value)}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 text-xs",
                                !proveedor.rubro &&
                                  "border-amber-300 dark:border-amber-700"
                              )}
                            >
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {RUBROS_DISPONIBLES.map((rubro) => (
                                <SelectItem key={rubro.value} value={rubro.value}>
                                  {rubro.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
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
          disabled={!hasCompras}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          Continuar a Retenciones
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

