"use client";

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase, RubroCompra } from "@/lib/supabase";
import {
  parsearArchivoCompras,
  agruparPorProveedor,
  CompraParsed,
  ProveedorResumen,
} from "@/lib/compras-parser";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Home,
  ShoppingBasket,
  Heart,
  GraduationCap,
  Shirt,
  Palmtree,
  Briefcase,
  HelpCircle,
  Search,
  X,
  CheckCheck,
} from "lucide-react";

interface ImportarComprasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuyenteRuc: string;
  onComprasImportadas: () => void;
}

const rubrosCompra: { value: RubroCompra; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "no_definido", label: "No Definido", icon: HelpCircle },
  { value: "vivienda", label: "Vivienda", icon: Home },
  { value: "alimentacion", label: "Alimentación", icon: ShoppingBasket },
  { value: "salud", label: "Salud", icon: Heart },
  { value: "educacion", label: "Educación", icon: GraduationCap },
  { value: "vestimenta", label: "Vestimenta", icon: Shirt },
  { value: "turismo", label: "Turismo", icon: Palmtree },
  { value: "actividad_profesional", label: "Actividad Profesional", icon: Briefcase },
];

// Mapeo de iconos para acceso rápido
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

type Step = "upload" | "importing" | "assign" | "updating" | "complete";

export function ImportarComprasDialog({
  open,
  onOpenChange,
  contribuyenteRuc,
  onComprasImportadas,
}: ImportarComprasDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [comprasParsed, setComprasParsed] = useState<CompraParsed[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorResumen[]>([]);
  const [comprasInsertadas, setComprasInsertadas] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para selección múltiple
  const [selectedProveedores, setSelectedProveedores] = useState<Set<string>>(new Set());
  const [rubroMasivo, setRubroMasivo] = useState<RubroCompra | "">("");
  const [searchFilter, setSearchFilter] = useState("");

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = useMemo(() => {
    if (!searchFilter.trim()) return proveedores;
    const search = searchFilter.toLowerCase();
    return proveedores.filter(
      (p) =>
        p.razon_social_proveedor.toLowerCase().includes(search) ||
        p.ruc_proveedor.includes(search)
    );
  }, [proveedores, searchFilter]);

  // Calcular estadísticas de selección
  const selectionStats = useMemo(() => {
    const selectedArray = Array.from(selectedProveedores);
    const selectedInView = proveedoresFiltrados.filter((p) =>
      selectedProveedores.has(p.ruc_proveedor)
    );
    const allInViewSelected =
      proveedoresFiltrados.length > 0 &&
      proveedoresFiltrados.every((p) => selectedProveedores.has(p.ruc_proveedor));
    const someInViewSelected = selectedInView.length > 0 && !allInViewSelected;

    return {
      total: selectedArray.length,
      inView: selectedInView.length,
      allInViewSelected,
      someInViewSelected,
    };
  }, [selectedProveedores, proveedoresFiltrados]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      toast.error("Por favor selecciona un archivo .txt");
      return;
    }

    try {
      const contenido = await file.text();
      const compras = parsearArchivoCompras(contenido);

      if (compras.length === 0) {
        toast.error("No se encontraron compras en el archivo");
        return;
      }

      setComprasParsed(compras);
      toast.success(`${compras.length} compras parseadas. Iniciando importación...`);
      await insertarComprasTemporales(compras);
    } catch (error: unknown) {
      console.error("Error al parsear archivo:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al procesar archivo: ${message}`);
    }
  };

  const insertarComprasTemporales = async (comprasParseadas: CompraParsed[]) => {
    const compras = comprasParseadas;
    setStep("importing");
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);

    const idsInsertados: string[] = [];
    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < compras.length; i += batchSize) {
      const batch = compras.slice(i, i + batchSize);

      try {
        const comprasParaInsertar = batch.map((compra) => ({
          contribuyente_ruc: contribuyenteRuc,
          ruc_proveedor: compra.ruc_proveedor,
          razon_social_proveedor: compra.razon_social_proveedor,
          fecha_emision: compra.fecha_emision,
          tipo_comprobante: compra.tipo_comprobante,
          numero_comprobante: compra.numero_comprobante,
          clave_acceso: compra.clave_acceso,
          valor_sin_impuesto: compra.valor_sin_impuesto,
          subtotal_0: 0,
          subtotal_8: 0,
          subtotal_15: 0,
          iva: compra.iva,
          total: compra.total,
        }));

        const { data, error } = await supabase
          .from("compras")
          .insert(comprasParaInsertar)
          .select("id");

        if (error) {
          console.error("Error insertando batch:", error);
          errors += batch.length;
        } else {
          imported += batch.length;
          if (data) {
            idsInsertados.push(...data.map((c: { id: string }) => c.id));
          }
        }
      } catch (error: unknown) {
        console.error("Error en batch:", error);
        errors += batch.length;
      }

      const progressValue = ((i + batch.length) / compras.length) * 100;
      setProgress(progressValue);
      setImportedCount(imported);
      setErrorCount(errors);

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setComprasInsertadas(idsInsertados);

    if (errors === 0) {
      toast.success(`${imported} compras guardadas. Ahora asigna los rubros.`);
    } else {
      toast.warning(`${imported} compras guardadas, ${errors} fallaron`);
    }

    await cargarProveedoresConRubros(compras, idsInsertados);
  };

  const cargarProveedoresConRubros = async (comprasParseadas: CompraParsed[], idsInsertados: string[]) => {
    try {
      const proveedoresAgrupados = agruparPorProveedor(comprasParseadas);

      const proveedoresConRubro = await Promise.all(
        proveedoresAgrupados.map(async (proveedor) => {
          try {
            const { data, error } = await supabase
              .from("compras")
              .select("id, rubro")
              .eq("contribuyente_ruc", contribuyenteRuc)
              .eq("ruc_proveedor", proveedor.ruc_proveedor)
              .neq("rubro", "no_definido")
              .limit(20);

            if (error) {
              console.error(`Error buscando rubros para ${proveedor.ruc_proveedor}:`, error);
            }

            let rubroSugerido: RubroCompra | undefined;

            if (data && data.length > 0) {
              const comprasAnteriores = data.filter((compra: { id: string; rubro: string }) => 
                !idsInsertados.includes(compra.id)
              );

              if (comprasAnteriores.length > 0) {
                const frecuencias: Record<string, number> = {};
                comprasAnteriores.forEach((compra: { id: string; rubro: string }) => {
                  if (compra.rubro) {
                    frecuencias[compra.rubro] = (frecuencias[compra.rubro] || 0) + 1;
                  }
                });

                const entries = Object.entries(frecuencias);
                if (entries.length > 0) {
                  const rubroMasFrecuente = entries.sort(([, a], [, b]) => b - a)[0]?.[0];
                  rubroSugerido = rubroMasFrecuente as RubroCompra;
                }
              }
            }

            return {
              ...proveedor,
              rubro: rubroSugerido,
            };
          } catch (error: unknown) {
            console.error(`Error procesando proveedor ${proveedor.ruc_proveedor}:`, error);
            return proveedor;
          }
        })
      );

      if (proveedoresConRubro.length === 0) {
        toast.error("No se pudieron agrupar los proveedores");
        return;
      }

      setProveedores(proveedoresConRubro);
      setSelectedProveedores(new Set());
      setStep("assign");
    } catch (error: unknown) {
      console.error("Error cargando proveedores:", error);
      toast.error("Error al cargar proveedores");
      setStep("upload");
    }
  };

  // Manejar selección individual
  const handleSelectProveedor = (rucProveedor: string, checked: boolean) => {
    setSelectedProveedores((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rucProveedor);
      } else {
        newSet.delete(rucProveedor);
      }
      return newSet;
    });
  };

  // Seleccionar/deseleccionar todos los visibles (filtrados)
  const handleSelectAllVisible = (checked: boolean) => {
    setSelectedProveedores((prev) => {
      const newSet = new Set(prev);
      proveedoresFiltrados.forEach((p) => {
        if (checked) {
          newSet.add(p.ruc_proveedor);
        } else {
          newSet.delete(p.ruc_proveedor);
        }
      });
      return newSet;
    });
  };

  // Aplicar rubro masivo a seleccionados
  const handleAplicarRubroMasivo = () => {
    if (!rubroMasivo || selectedProveedores.size === 0) {
      toast.error("Selecciona proveedores y un rubro");
      return;
    }

    setProveedores((prev) =>
      prev.map((p) =>
        selectedProveedores.has(p.ruc_proveedor)
          ? { ...p, rubro: rubroMasivo as RubroCompra }
          : p
      )
    );

    toast.success(`Rubro "${rubrosCompra.find(r => r.value === rubroMasivo)?.label}" asignado a ${selectedProveedores.size} proveedores`);
    setSelectedProveedores(new Set());
    setRubroMasivo("");
  };

  // Seleccionar todos los que no tienen rubro
  const handleSelectSinRubro = () => {
    const sinRubro = proveedoresFiltrados.filter((p) => !p.rubro);
    setSelectedProveedores(new Set(sinRubro.map((p) => p.ruc_proveedor)));
    if (sinRubro.length === 0) {
      toast.info("Todos los proveedores ya tienen rubro asignado");
    } else {
      toast.info(`${sinRubro.length} proveedores sin rubro seleccionados`);
    }
  };

  const handleRubroChange = (rucProveedor: string, rubro: RubroCompra) => {
    setProveedores((prev) =>
      prev.map((p) =>
        p.ruc_proveedor === rucProveedor ? { ...p, rubro } : p
      )
    );
  };

  const handleActualizarRubros = async () => {
    const proveedoresSinRubro = proveedores.filter((p) => !p.rubro);
    if (proveedoresSinRubro.length > 0) {
      toast.error(
        `Por favor asigna un rubro a todos los proveedores (${proveedoresSinRubro.length} pendientes)`
      );
      return;
    }

    setStep("updating");
    setProgress(0);
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < proveedores.length; i++) {
      const proveedor = proveedores[i];

      try {
        const { error } = await supabase
          .from("compras")
          .update({ rubro: proveedor.rubro })
          .eq("contribuyente_ruc", contribuyenteRuc)
          .eq("ruc_proveedor", proveedor.ruc_proveedor)
          .in("id", comprasInsertadas);

        if (error) {
          console.error("Error actualizando proveedor:", error);
          errors++;
        } else {
          updated++;
        }
      } catch (error: unknown) {
        console.error("Error:", error);
        errors++;
      }

      const progressValue = ((i + 1) / proveedores.length) * 100;
      setProgress(progressValue);
    }

    setStep("complete");

    if (errors === 0) {
      toast.success(`Rubros actualizados correctamente para ${updated} proveedores`);
    } else {
      toast.warning(`${updated} proveedores actualizados, ${errors} fallaron`);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setComprasParsed([]);
    setProveedores([]);
    setComprasInsertadas([]);
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
    setSelectedProveedores(new Set());
    setRubroMasivo("");
    setSearchFilter("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);

    if (step === "complete") {
      onComprasImportadas();
    }
  };

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const todosRubrosAsignados = proveedores.every((p) => p.rubro);
  const proveedoresSinRubroCount = proveedores.filter((p) => !p.rubro).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1100px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Compras desde TXT
          </DialogTitle>
          <DialogDescription>
            Sube un archivo de compras del SRI y asigna rubros a cada proveedor
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Formato del archivo</AlertTitle>
              <AlertDescription>
                Sube el archivo TXT de compras descargado del portal del SRI.
                El archivo debe contener las columnas estándar del SRI.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Haz clic para seleccionar un archivo
                </span>
                <span className="text-xs text-muted-foreground">
                  Formato: .TXT (delimitado por tabuladores)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Assign Rubros */}
        {step === "assign" && (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Barra de acciones masivas - siempre visible cuando hay selección */}
            {selectedProveedores.size > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex flex-wrap items-center gap-3 flex-shrink-0">
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
                              {rubrosCompra.find(r => r.value === rubroMasivo)?.label}
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {rubrosCompra.filter(r => r.value !== "no_definido").map((rubro) => {
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
                  
                  <Button
                    size="sm"
                    onClick={handleAplicarRubroMasivo}
                    disabled={!rubroMasivo}
                  >
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

            {/* Filtros y acciones */}
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
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
                variant="outline"
                size="sm"
                onClick={handleSelectSinRubro}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Seleccionar sin rubro ({proveedoresSinRubroCount})
              </Button>

              <div className="text-sm text-muted-foreground ml-auto">
                {proveedoresFiltrados.length} de {proveedores.length} proveedores
                {searchFilter && " (filtrados)"}
              </div>
            </div>

            <Alert className="flex-shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Asignar rubros</AlertTitle>
              <AlertDescription>
                Se guardaron {comprasParsed.length} compras de {proveedores.length} proveedores. 
                Usa los checkboxes para seleccionar varios y asignar rubros masivamente, 
                o asigna individualmente con el selector de cada fila.
              </AlertDescription>
            </Alert>

            {/* Tabla con scroll horizontal */}
            <div className="border rounded-lg flex-1 overflow-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] sticky left-0 bg-background z-10">
                        <Checkbox
                          checked={selectionStats.allInViewSelected}
                          onCheckedChange={handleSelectAllVisible}
                          aria-label="Seleccionar todos"
                          className={selectionStats.someInViewSelected ? "opacity-50" : ""}
                        />
                      </TableHead>
                      <TableHead className="min-w-[250px]">Proveedor</TableHead>
                      <TableHead className="text-center min-w-[100px]"># Compras</TableHead>
                      <TableHead className="text-right min-w-[120px]">Valor S/I</TableHead>
                      <TableHead className="text-right min-w-[100px]">IVA</TableHead>
                      <TableHead className="text-right min-w-[120px]">Total</TableHead>
                      <TableHead className="min-w-[220px]">Rubro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proveedoresFiltrados.map((proveedor) => (
                      <TableRow 
                        key={proveedor.ruc_proveedor}
                        className={selectedProveedores.has(proveedor.ruc_proveedor) ? "bg-primary/5" : ""}
                      >
                        <TableCell className="sticky left-0 bg-background z-10">
                          <Checkbox
                            checked={selectedProveedores.has(proveedor.ruc_proveedor)}
                            onCheckedChange={(checked) =>
                              handleSelectProveedor(proveedor.ruc_proveedor, checked as boolean)
                            }
                            aria-label={`Seleccionar ${proveedor.razon_social_proveedor}`}
                          />
                        </TableCell>
                        <TableCell className="min-w-[250px]">
                          <div className="flex flex-col">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium text-sm truncate block cursor-help max-w-[230px]">
                                  {proveedor.razon_social_proveedor}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="text-sm">{proveedor.razon_social_proveedor}</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-xs text-muted-foreground">
                              {proveedor.ruc_proveedor}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {proveedor.cantidad_compras}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatearMoneda(proveedor.valor_sin_impuesto)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatearMoneda(proveedor.iva_total)}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {formatearMoneda(proveedor.total_compras)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Select
                              value={proveedor.rubro || ""}
                              onValueChange={(value) =>
                                handleRubroChange(
                                  proveedor.ruc_proveedor,
                                  value as RubroCompra
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar">
                                  {proveedor.rubro && (
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const Icon = rubrosIconos[proveedor.rubro];
                                        return <Icon className="h-4 w-4" />;
                                      })()}
                                      <span>
                                        {rubrosCompra.find(r => r.value === proveedor.rubro)?.label}
                                      </span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {rubrosCompra.map((rubro) => {
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
                            {proveedor.rubro && (
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
                        {proveedores.reduce((sum, p) => sum + p.cantidad_compras, 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatearMoneda(
                          proveedores.reduce((sum, p) => sum + p.valor_sin_impuesto, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatearMoneda(
                          proveedores.reduce((sum, p) => sum + p.iva_total, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatearMoneda(
                          proveedores.reduce((sum, p) => sum + p.total_compras, 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Step 2: Importing */}
        {step === "importing" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Guardando compras</AlertTitle>
              <AlertDescription>
                Por favor espera mientras se guardan las compras en la base de datos...
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {importedCount} de {comprasParsed.length} guardadas
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              {errorCount > 0 && (
                <p className="text-sm text-destructive">
                  {errorCount} errores encontrados
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Updating */}
        {step === "updating" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Actualizando rubros</AlertTitle>
              <AlertDescription>
                Por favor espera mientras se actualizan los rubros de las compras...
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Actualizando proveedores...</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && (
          <div className="space-y-4">
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Importación completada</AlertTitle>
              <AlertDescription>
                Se han importado {importedCount} compras exitosamente
                {errorCount > 0 && ` (${errorCount} errores)`}.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Compras importadas</p>
                <p className="text-2xl font-bold">{importedCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proveedores</p>
                <p className="text-2xl font-bold">{proveedores.length}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === "importing" && (
            <Button disabled>
              Guardando compras...
            </Button>
          )}

          {step === "assign" && (
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="text-sm text-muted-foreground">
                {proveedoresSinRubroCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    {proveedoresSinRubroCount} proveedor{proveedoresSinRubroCount !== 1 ? "es" : ""} sin rubro
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Todos los rubros asignados
                  </span>
                )}
              </div>
              <Button
                onClick={handleActualizarRubros}
                disabled={!todosRubrosAsignados}
              >
                Actualizar Rubros
              </Button>
            </div>
          )}

          {step === "updating" && (
            <Button disabled>
              Actualizando rubros...
            </Button>
          )}

          {step === "complete" && (
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
