"use client";

import { useState, useRef } from "react";
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
  const [comprasInsertadas, setComprasInsertadas] = useState<string[]>([]); // IDs de compras insertadas
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo .txt
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
      
      // Iniciar importación automáticamente - pasar compras para evitar problemas de estado
      await insertarComprasTemporales(compras);
    } catch (error: unknown) {
      console.error("Error al parsear archivo:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al procesar archivo: ${message}`);
    }
  };

  const insertarComprasTemporales = async (comprasParseadas: CompraParsed[]) => {
    const compras = comprasParseadas; // Renombrar para claridad
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
          // rubro se asigna automáticamente como "no_definido" por la BD
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

      // Actualizar progreso
      const progressValue = ((i + batch.length) / compras.length) * 100;
      setProgress(progressValue);
      setImportedCount(imported);
      setErrorCount(errors);

      // Pequeña pausa
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("Compras insertadas, IDs:", idsInsertados.length);
    setComprasInsertadas(idsInsertados);

    if (errors === 0) {
      toast.success(`${imported} compras guardadas. Ahora asigna los rubros.`);
    } else {
      toast.warning(`${imported} compras guardadas, ${errors} fallaron`);
    }

    // Ahora cargar proveedores con rubros sugeridos
    console.log("Iniciando carga de proveedores...");
    await cargarProveedoresConRubros(compras, idsInsertados);
    console.log("Carga de proveedores completada");
  };

  const cargarProveedoresConRubros = async (comprasParseadas: CompraParsed[], idsInsertados: string[]) => {
    try {
      console.log("Cargando proveedores con rubros...");
      console.log("Compras insertadas:", idsInsertados.length);
      console.log("Compras a agrupar:", comprasParseadas.length);
      
      // Agrupar proveedores del archivo parseado
      const proveedoresAgrupados = agruparPorProveedor(comprasParseadas);
      console.log("Proveedores agrupados:", proveedoresAgrupados.length);

      // Para cada proveedor, buscar el rubro más frecuente en compras anteriores
      const proveedoresConRubro = await Promise.all(
        proveedoresAgrupados.map(async (proveedor) => {
          try {
            // Buscar rubro más frecuente de este proveedor en compras anteriores
            // Excluir las recién insertadas y las que tienen "no_definido"
            const { data, error } = await supabase
              .from("compras")
              .select("id, rubro")
              .eq("contribuyente_ruc", contribuyenteRuc)
              .eq("ruc_proveedor", proveedor.ruc_proveedor)
              .neq("rubro", "no_definido") // Solo compras con rubro asignado
              .limit(20);

            if (error) {
              console.error(`Error buscando rubros para ${proveedor.ruc_proveedor}:`, error);
            }

            let rubroSugerido: RubroCompra | undefined;

            if (data && data.length > 0) {
              // Filtrar las compras recién insertadas
              const comprasAnteriores = data.filter((compra: { id: string; rubro: string }) => 
                !idsInsertados.includes(compra.id)
              );

              if (comprasAnteriores.length > 0) {
                // Contar frecuencia de rubros
                const frecuencias: Record<string, number> = {};
                comprasAnteriores.forEach((compra: { id: string; rubro: string }) => {
                  if (compra.rubro) {
                    frecuencias[compra.rubro] = (frecuencias[compra.rubro] || 0) + 1;
                  }
                });

                // Obtener el más frecuente
                const entries = Object.entries(frecuencias);
                if (entries.length > 0) {
                  const rubroMasFrecuente = entries.sort(
                    ([, a], [, b]) => b - a
                  )[0]?.[0];
                  
                  rubroSugerido = rubroMasFrecuente as RubroCompra;
                  console.log(`Rubro sugerido para ${proveedor.razon_social_proveedor}:`, rubroSugerido);
                }
              }
            }

            return {
              ...proveedor,
              rubro: rubroSugerido,
            };
          } catch (error: unknown) {
            console.error(`Error procesando proveedor ${proveedor.ruc_proveedor}:`, error);
            return proveedor; // Sin rubro sugerido si hay error
          }
        })
      );

      console.log("Proveedores con rubros procesados:", proveedoresConRubro.length);
      console.log("Detalle proveedores:", proveedoresConRubro);
      
      if (proveedoresConRubro.length === 0) {
        console.error("ERROR: No se agruparon proveedores");
        toast.error("No se pudieron agrupar los proveedores");
        return;
      }
      
      setProveedores(proveedoresConRubro);
      console.log("Estado proveedores actualizado, cambiando step a 'assign'");
      setStep("assign");
      console.log("Step cambiado a: assign");
    } catch (error: unknown) {
      console.error("Error cargando proveedores:", error);
      toast.error("Error al cargar proveedores");
      // Volver al paso de upload si hay error
      setStep("upload");
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
    // Validar que todos los proveedores tengan rubro asignado
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

    // Actualizar rubros por proveedor
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

      // Actualizar progreso
      const progressValue = ((i + 1) / proveedores.length) * 100;
      setProgress(progressValue);
    }

    setStep("complete");

    if (errors === 0) {
      toast.success(`Rubros actualizados correctamente para ${updated} proveedores`);
    } else {
      toast.warning(
        `${updated} proveedores actualizados, ${errors} fallaron`
      );
    }
  };

  const handleClose = () => {
    // Reset state
    setStep("upload");
    setComprasParsed([]);
    setProveedores([]);
    setComprasInsertadas([]);
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
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
            <Alert className="flex-shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Asignar rubros</AlertTitle>
              <AlertDescription>
                Se guardaron {comprasParsed.length} compras de{" "}
                {proveedores.length} proveedores. Los rubros marcados con ✓ son sugerencias basadas en compras anteriores. Confirma o cambia los rubros según sea necesario.
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg flex-1 overflow-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="max-w-[250px]">Proveedor</TableHead>
                      <TableHead className="text-center hidden sm:table-cell"># Compras</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Valor S/I</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">IVA</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Total</TableHead>
                      <TableHead className="min-w-[200px]">Rubro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proveedores.map((proveedor) => (
                      <TableRow key={proveedor.ruc_proveedor}>
                        <TableCell className="max-w-[250px]">
                          <div className="flex flex-col">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium text-sm truncate block cursor-help">
                                  {proveedor.razon_social_proveedor}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="text-sm">{proveedor.razon_social_proveedor}</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-xs text-muted-foreground truncate">
                              {proveedor.ruc_proveedor}
                            </span>
                            {/* Mostrar info adicional en móviles */}
                            <div className="flex gap-2 mt-1 sm:hidden flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {proveedor.cantidad_compras} compras
                              </Badge>
                              <span className="text-xs font-medium text-muted-foreground">
                                {formatearMoneda(proveedor.total_compras)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant="secondary">
                          {proveedor.cantidad_compras}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                        {formatearMoneda(proveedor.valor_sin_impuesto)}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                        {formatearMoneda(proveedor.iva_total)}
                      </TableCell>
                      <TableCell className="text-right font-medium hidden md:table-cell whitespace-nowrap">
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
                              ✓ Sugerido
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell className="text-center font-bold hidden sm:table-cell">
                      {proveedores.reduce((sum, p) => sum + p.cantidad_compras, 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold hidden lg:table-cell">
                      {formatearMoneda(
                        proveedores.reduce((sum, p) => sum + p.valor_sin_impuesto, 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold hidden lg:table-cell">
                      {formatearMoneda(
                        proveedores.reduce((sum, p) => sum + p.iva_total, 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold hidden md:table-cell">
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
                <span>
                  Actualizando proveedores...
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
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
            <Button
              onClick={handleActualizarRubros}
              disabled={!todosRubrosAsignados}
            >
              Actualizar Rubros
            </Button>
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

