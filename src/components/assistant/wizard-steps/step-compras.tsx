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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { AgentMessage } from "../agent-message";
import { ArrowLeft, ArrowRight, Upload, Check, AlertCircle, AlertTriangle, Building2, SkipForward, ChevronDown } from "lucide-react";
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
  onFileProcess: (file: File) => Promise<{ compras: CompraParsed[]; proveedores: ProveedorResumen[]; warnings?: string[]; skippedCount?: number }>;
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
      if (result.warnings && result.warnings.length > 0) {
        setParseWarnings(result.warnings);
        setSkippedCount(result.skippedCount || 0);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar el archivo. Verifica que sea el formato correcto del SRI.";
      setError(message);
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
          isDragging && "border-primary bg-primary/5",
          hasCompras && "border-primary/30 bg-primary/5",
          !isDragging && !hasCompras && "border-border hover:border-primary"
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
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">
                    {compras.archivo?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {compras.parsed.length} compras • {compras.proveedores.length} proveedores • Click para cambiar
                  </p>
                </div>
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
                      ? "Procesando archivo..."
                      : isDragging
                      ? "Suelta el archivo aquí"
                      : "Arrastra tu archivo de compras aquí"}
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

      {/* Preview de compras */}
      {hasCompras && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-primary">Total Compras</p>
                <p className="text-2xl font-bold text-foreground">
                  {compras.parsed.length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-primary">Total Monto</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalCompras.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-primary">Crédito Tributario</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalIVA.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de proveedores con rubros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium text-foreground">
                  Asignar Rubros a Proveedores
                </h4>
                {proveedoresSinRubro > 0 && (
                  <Badge variant="secondary">
                    {proveedoresSinRubro} pendientes
                  </Badge>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
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
                                  "border-destructive/50"
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
          {!hasCompras && (
            <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
              <SkipForward className="mr-2 h-4 w-4" />
              Omitir
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!hasCompras}
          >
            Continuar a Retenciones
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
