"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
  TableFooter,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AgentMessage } from "../agent-message";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Upload,
  Check,
  AlertCircle,
  AlertTriangle,
  Building2,
  SkipForward,
  ChevronDown,
  Play,
  Search,
  X,
  CheckCheck,
  Home,
  ShoppingBasket,
  Heart,
  GraduationCap,
  Shirt,
  Palmtree,
  Briefcase,
  HelpCircle,
  Trash2,
  FileText,
  FileCode2,
} from "lucide-react";
import { CompraParsed, ProveedorResumen } from "@/lib/compras-parser";
import { ComprasXMLParseResult } from "@/lib/compras-xml-parser";
import { RubroCompra } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StepComprasProps {
  compras: {
    formato: "txt" | "xml";
    archivo: File | null;
    archivosXml: File[];
    parsed: CompraParsed[];
    proveedores: ProveedorResumen[];
    guardadas: boolean;
  };
  periodo: { mes: number; anio: number };
  contribuyenteRuc: string;
  onFileProcess: (file: File) => Promise<{ compras: CompraParsed[]; proveedores: ProveedorResumen[]; warnings?: string[]; skippedCount?: number }>;
  onXmlFilesProcess: (files: File[], onProgress?: (percent: number) => void) => Promise<ComprasXMLParseResult>;
  onRubroChange: (ruc: string, rubro: string) => void;
  onBulkRubroChange: (rucs: string[], rubro: string) => void;
  onClear: () => void;
  onNext: () => void;
  onBack: () => void;
}

const RUBROS_DISPONIBLES: { value: RubroCompra; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "no_definido", label: "No Definido", icon: HelpCircle },
  { value: "vivienda", label: "Vivienda", icon: Home },
  { value: "alimentacion", label: "Alimentación", icon: ShoppingBasket },
  { value: "salud", label: "Salud", icon: Heart },
  { value: "educacion", label: "Educación", icon: GraduationCap },
  { value: "vestimenta", label: "Vestimenta", icon: Shirt },
  { value: "turismo", label: "Turismo", icon: Palmtree },
  { value: "actividad_profesional", label: "Actividad Profesional", icon: Briefcase },
];

const rubrosIconos: Record<RubroCompra, React.ComponentType<{ className?: string }>> = {
  no_definido: HelpCircle,
  vivienda: Home,
  alimentacion: ShoppingBasket,
  salud: Heart,
  educacion: GraduationCap,
  vestimenta: Shirt,
  turismo: Palmtree,
  actividad_profesional: Briefcase,
};

export function StepCompras({
  compras,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  periodo,
  contribuyenteRuc,
  onFileProcess,
  onXmlFilesProcess,
  onRubroChange,
  onBulkRubroChange,
  onClear,
  onNext,
  onBack,
}: StepComprasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [warningsOpen, setWarningsOpen] = useState(false);

  // XML-specific state
  const [formato, setFormato] = useState<"txt" | "xml">(compras.formato);
  const [xmlProgress, setXmlProgress] = useState(0);
  const [xmlParseResult, setXmlParseResult] = useState<ComprasXMLParseResult | null>(null);

  // Multi-selection & bulk state
  const [selectedProveedores, setSelectedProveedores] = useState<Set<string>>(new Set());
  const [rubroMasivo, setRubroMasivo] = useState<RubroCompra | "">("");
  const [searchFilter, setSearchFilter] = useState("");
  const [showOnlySinRubro, setShowOnlySinRubro] = useState(false);
  const [rubroSummaryOpen, setRubroSummaryOpen] = useState(false);

  // Auto-suggest rubros from previous imports
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

  useEffect(() => {
    if (compras.proveedores.length > 0 && !suggestionsLoaded) {
      fetchRubroSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compras.proveedores.length]);

  const fetchRubroSuggestions = async () => {
    const proveedoresSinRubro = compras.proveedores.filter((p) => !p.rubro);
    if (proveedoresSinRubro.length === 0) {
      setSuggestionsLoaded(true);
      return;
    }

    try {
      const response = await fetch("/api/import/rubro-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contribuyenteRuc,
          proveedorRucs: proveedoresSinRubro.map((p) => p.ruc_proveedor),
        }),
      });

      if (response.ok) {
        const { suggestions } = await response.json();
        if (suggestions && Object.keys(suggestions).length > 0) {
          // Apply suggestions only to providers without a rubro
          const rucsToUpdate: string[] = [];
          for (const [ruc, rubro] of Object.entries(suggestions)) {
            const proveedor = compras.proveedores.find((p) => p.ruc_proveedor === ruc);
            if (proveedor && !proveedor.rubro) {
              rucsToUpdate.push(ruc);
              onRubroChange(ruc, rubro as string);
            }
          }
          if (rucsToUpdate.length > 0) {
            toast.info(`${rucsToUpdate.length} rubros sugeridos automáticamente basados en importaciones anteriores`);
          }
        }
      }
    } catch {
      // Silently fail - suggestions are optional
    } finally {
      setSuggestionsLoaded(true);
    }
  };

  // Filtrar proveedores por búsqueda y/o filtro de sin rubro
  const proveedoresFiltrados = useMemo(() => {
    let filtered = compras.proveedores;

    if (showOnlySinRubro) {
      filtered = filtered.filter((p) => !p.rubro || p.rubro === "no_definido");
    }

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.razon_social_proveedor.toLowerCase().includes(search) ||
          p.ruc_proveedor.includes(search)
      );
    }

    return filtered;
  }, [compras.proveedores, searchFilter, showOnlySinRubro]);

  // Selection stats
  const selectionStats = useMemo(() => {
    const selectedInView = proveedoresFiltrados.filter((p) =>
      selectedProveedores.has(p.ruc_proveedor)
    );
    const allInViewSelected =
      proveedoresFiltrados.length > 0 &&
      proveedoresFiltrados.every((p) => selectedProveedores.has(p.ruc_proveedor));
    const someInViewSelected = selectedInView.length > 0 && !allInViewSelected;

    return {
      total: selectedProveedores.size,
      allInViewSelected,
      someInViewSelected,
    };
  }, [selectedProveedores, proveedoresFiltrados]);

  // Resumen por rubro
  const rubroSummary = useMemo(() => {
    const map = new Map<string, { label: string; count: number; total: number }>();
    for (const p of compras.proveedores) {
      const rubro = p.rubro || "no_definido";
      const entry = map.get(rubro) || { label: RUBROS_DISPONIBLES.find((r) => r.value === rubro)?.label || rubro, count: 0, total: 0 };
      entry.count += p.cantidad_compras;
      entry.total += p.total_compras;
      map.set(rubro, entry);
    }
    const grandTotal = compras.proveedores.reduce((s, p) => s + p.total_compras, 0);
    return Array.from(map.entries()).map(([rubro, data]) => ({
      rubro: rubro as RubroCompra,
      ...data,
      percent: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }));
  }, [compras.proveedores]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processTxtFile = async (file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".TXT")) {
      setError("Por favor selecciona un archivo TXT del SRI");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setParseWarnings([]);
    setSkippedCount(0);
    setSuggestionsLoaded(false);

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
    setSuggestionsLoaded(false);

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
    const files = e.dataTransfer.files;
    if (formato === "xml") {
      await processXmlFiles(Array.from(files));
    } else {
      const file = files[0];
      if (file) {
        await processTxtFile(file);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formato]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formato === "xml") {
      await processXmlFiles(Array.from(files));
    } else {
      await processTxtFile(files[0]);
    }
  };

  // Selection handlers
  const handleSelectProveedor = (ruc: string, checked: boolean) => {
    setSelectedProveedores((prev) => {
      const newSet = new Set(prev);
      if (checked) newSet.add(ruc);
      else newSet.delete(ruc);
      return newSet;
    });
  };

  const handleSelectAllVisible = (checked: boolean) => {
    setSelectedProveedores((prev) => {
      const newSet = new Set(prev);
      proveedoresFiltrados.forEach((p) => {
        if (checked) newSet.add(p.ruc_proveedor);
        else newSet.delete(p.ruc_proveedor);
      });
      return newSet;
    });
  };

  const handleAplicarRubroMasivo = () => {
    if (!rubroMasivo || selectedProveedores.size === 0) {
      toast.error("Selecciona proveedores y un rubro");
      return;
    }
    onBulkRubroChange(Array.from(selectedProveedores), rubroMasivo);
    toast.success(`Rubro "${RUBROS_DISPONIBLES.find((r) => r.value === rubroMasivo)?.label}" asignado a ${selectedProveedores.size} proveedores`);
    setSelectedProveedores(new Set());
    setRubroMasivo("");
  };

  const handleToggleSinRubro = () => {
    const newValue = !showOnlySinRubro;
    setShowOnlySinRubro(newValue);
    setSelectedProveedores(new Set());

    if (newValue) {
      const sinRubroCount = compras.proveedores.filter((p) => !p.rubro || p.rubro === "no_definido").length;
      if (sinRubroCount === 0) {
        toast.info("Todos los proveedores ya tienen rubro asignado");
        setShowOnlySinRubro(false);
      }
    }
  };

  // Calcular totales
  const totalCompras = compras.parsed.reduce((sum, c) => sum + c.valor_sin_impuesto, 0);
  const totalIVA = compras.parsed.reduce((sum, c) => sum + c.iva, 0);
  const totalGeneral = compras.parsed.reduce((sum, c) => sum + c.total, 0);
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
            : formato === "xml"
            ? "Selecciona los archivos XML de facturas electrónicas autorizadas del SRI. Puedes arrastrar múltiples archivos a la vez."
            : "Ahora necesito el archivo TXT de compras del SRI. Este archivo contiene todas las facturas que has recibido de tus proveedores durante el período."
        }
        animate={!hasCompras}
      />

      {/* Selector de formato (solo visible cuando no hay datos cargados) */}
      {!hasCompras && (
        <div className="flex gap-2">
          <Button
            variant={formato === "txt" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFormato("txt");
              setError(null);
              setXmlParseResult(null);
            }}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Archivo TXT
          </Button>
          <Button
            variant={formato === "xml" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFormato("xml");
              setError(null);
              setParseWarnings([]);
            }}
            className="gap-2"
          >
            <FileCode2 className="h-4 w-4" />
            Facturas XML
          </Button>
        </div>
      )}

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
              accept={formato === "txt" ? ".txt,.TXT" : ".xml,.XML"}
              multiple={formato === "xml"}
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
                    {compras.formato === "xml"
                      ? `${compras.archivosXml.length} archivos XML procesados`
                      : compras.archivo?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {compras.parsed.length} compras • {compras.proveedores.length} proveedores • Click para cambiar
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
                    setFormato("txt");
                    setError(null);
                    setParseWarnings([]);
                    setXmlParseResult(null);
                    setXmlProgress(0);
                    setSelectedProveedores(new Set());
                    setSuggestionsLoaded(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar archivo{compras.formato === "xml" ? "s" : ""}
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
                      ? "Procesando archivo..."
                      : isDragging
                      ? `Suelta ${formato === "xml" ? "los archivos" : "el archivo"} aquí`
                      : formato === "xml"
                      ? "Arrastra tus facturas XML aquí"
                      : "Arrastra tu archivo de compras aquí"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formato === "xml"
                      ? "Formato: .XML (facturas electrónicas del SRI) — puedes seleccionar múltiples"
                      : "Formato: .TXT del portal SRI"}
                  </p>
                </div>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      {/* Barra de progreso XML */}
      {isProcessing && formato === "xml" && (
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
              {xmlParseResult.compras.length}
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

          {/* Bulk action bar */}
          {selectedProveedores.size > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {selectedProveedores.size} proveedor{selectedProveedores.size !== 1 ? "es" : ""} seleccionado{selectedProveedores.size !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Select
                  value={rubroMasivo}
                  onValueChange={(value) => setRubroMasivo(value as RubroCompra)}
                >
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue placeholder="Seleccionar rubro">
                      {rubroMasivo && (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = rubrosIconos[rubroMasivo as RubroCompra];
                            return <Icon className="h-4 w-4" />;
                          })()}
                          <span>
                            {RUBROS_DISPONIBLES.find((r) => r.value === rubroMasivo)?.label}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RUBROS_DISPONIBLES.filter((r) => r.value !== "no_definido").map((rubro) => {
                      const Icon = rubro.icon;
                      return (
                        <SelectItem key={rubro.value} value={rubro.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{rubro.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Button size="sm" onClick={handleAplicarRubroMasivo} disabled={!rubroMasivo}>
                  Aplicar
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProveedores(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            </div>
          )}

          {/* Search & actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedor..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8"
              />
            </div>

            <Button
              variant={showOnlySinRubro ? "default" : "outline"}
              size="sm"
              onClick={handleToggleSinRubro}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {showOnlySinRubro ? "Mostrar todos" : `Rubros faltantes (${proveedoresSinRubro})`}
            </Button>

            <div className="text-sm text-muted-foreground ml-auto">
              {proveedoresFiltrados.length} de {compras.proveedores.length} proveedores
              {searchFilter && " (filtrados)"}
            </div>
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

              <div className="max-h-80 overflow-y-auto rounded-lg border">
                <TooltipProvider>
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50 z-10">
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectionStats.allInViewSelected}
                            onCheckedChange={handleSelectAllVisible}
                            aria-label="Seleccionar todos"
                            className={selectionStats.someInViewSelected ? "opacity-50" : ""}
                          />
                        </TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-center w-[80px]"># Compras</TableHead>
                        <TableHead className="text-right w-[110px]">Valor S/I</TableHead>
                        <TableHead className="text-right w-[90px]">IVA</TableHead>
                        <TableHead className="text-right w-[110px]">Total</TableHead>
                        <TableHead className="w-[200px]">Rubro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proveedoresFiltrados.map((proveedor) => (
                        <TableRow
                          key={proveedor.ruc_proveedor}
                          className={selectedProveedores.has(proveedor.ruc_proveedor) ? "bg-primary/5" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedProveedores.has(proveedor.ruc_proveedor)}
                              onCheckedChange={(checked) =>
                                handleSelectProveedor(proveedor.ruc_proveedor, checked as boolean)
                              }
                              aria-label={`Seleccionar ${proveedor.razon_social_proveedor}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium text-sm truncate block cursor-help max-w-[200px]">
                                    {proveedor.razon_social_proveedor}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px]">
                                  <p className="text-sm">{proveedor.razon_social_proveedor}</p>
                                </TooltipContent>
                              </Tooltip>
                              <span className="text-xs text-muted-foreground font-mono">
                                {proveedor.ruc_proveedor}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {proveedor.cantidad_compras}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-sm">
                            ${proveedor.valor_sin_impuesto.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-sm">
                            ${proveedor.iva_total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap text-sm">
                            ${proveedor.total_compras.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Select
                                value={proveedor.rubro || ""}
                                onValueChange={(value) => onRubroChange(proveedor.ruc_proveedor, value)}
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-8 text-xs",
                                    !proveedor.rubro && "border-destructive/50"
                                  )}
                                >
                                  <SelectValue placeholder="Seleccionar...">
                                    {proveedor.rubro && (
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const Icon = rubrosIconos[proveedor.rubro];
                                          return <Icon className="h-3.5 w-3.5" />;
                                        })()}
                                        <span>
                                          {RUBROS_DISPONIBLES.find((r) => r.value === proveedor.rubro)?.label}
                                        </span>
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {RUBROS_DISPONIBLES.map((rubro) => {
                                    const Icon = rubro.icon;
                                    return (
                                      <SelectItem key={rubro.value} value={rubro.value}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          <span>{rubro.label}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {proveedor.rubro && proveedor.rubro !== "no_definido" && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  ✓ Asignado
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-center font-bold">
                          {compras.proveedores.reduce((sum, p) => sum + p.cantidad_compras, 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${compras.proveedores.reduce((sum, p) => sum + p.valor_sin_impuesto, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${compras.proveedores.reduce((sum, p) => sum + p.iva_total, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${totalGeneral.toFixed(2)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          {/* Resumen por rubro (collapsible) */}
          <Collapsible open={rubroSummaryOpen} onOpenChange={setRubroSummaryOpen}>
            <Card>
              <CardContent className="pt-6">
                <CollapsibleTrigger className="flex items-center gap-2 w-full cursor-pointer">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium text-foreground flex-1 text-left">
                    Desglose por Rubro
                  </h4>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", rubroSummaryOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rubro</TableHead>
                          <TableHead className="text-center"># Compras</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">% del Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rubroSummary.map((item) => {
                          const Icon = rubrosIconos[item.rubro] || HelpCircle;
                          return (
                            <TableRow key={item.rubro}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{item.label}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{item.count}</TableCell>
                              <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{item.percent.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
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
            <Play className="mr-2 h-4 w-4" />
            Procesar Todo
          </Button>
        </div>
      </div>
    </div>
  );
}
