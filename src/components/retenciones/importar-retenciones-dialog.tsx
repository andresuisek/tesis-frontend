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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  parsearMultiplesXML,
  ParseResult,
  RetencionParsed,
  calcularTotalRetencion,
} from "@/lib/retencion-xml-parser";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Link2,
  Link2Off,
  Receipt,
} from "lucide-react";

interface ImportarRetencionesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuyenteRuc: string;
  onRetencionesImportadas: () => void;
}

interface RetencionPreview extends RetencionParsed {
  fileName: string;
  ventaEncontrada: boolean;
  ventaId?: string;
  yaExiste: boolean;
  error?: string;
}

type Step = "upload" | "preview" | "importing" | "complete";

export function ImportarRetencionesDialog({
  open,
  onOpenChange,
  contribuyenteRuc,
  onRetencionesImportadas,
}: ImportarRetencionesDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [retencionesParsed, setRetencionesParsed] = useState<RetencionPreview[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [linkedCount, setLinkedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const xmlFiles = Array.from(files).filter(
      (file) => file.name.toLowerCase().endsWith(".xml")
    );

    if (xmlFiles.length === 0) {
      toast.error("Por favor selecciona archivos XML");
      return;
    }

    toast.info(`Procesando ${xmlFiles.length} archivo(s)...`);

    try {
      // Parsear todos los archivos
      const results = await parsearMultiplesXML(xmlFiles);

      const exitosos = results.filter((r) => r.success && r.retencion);
      const errores = results.filter((r) => !r.success);

      setParseErrors(errores);

      if (exitosos.length === 0) {
        toast.error("No se pudo procesar ningún archivo correctamente");
        return;
      }

      // Verificar existencia y buscar ventas para cada retención
      const retencionesConInfo: RetencionPreview[] = [];

      for (const result of exitosos) {
        if (!result.retencion) continue;

        const retencion = result.retencion;
        let ventaEncontrada = false;
        let ventaId: string | undefined;
        let yaExiste = false;

        // Verificar si la retención ya existe por clave de acceso
        if (retencion.clave_acceso) {
          const { data: existente } = await supabase
            .from("retenciones")
            .select("id")
            .eq("clave_acceso", retencion.clave_acceso)
            .single();

          if (existente) {
            yaExiste = true;
          }
        }

        // Buscar la venta correspondiente con múltiples formatos
        if (retencion.num_doc_sustento && !yaExiste) {
          console.log("=== Buscando venta para retención ===");
          console.log("Datos de búsqueda:", {
            numDocSustento: retencion.num_doc_sustento,
            numDocSustentoRaw: retencion.num_doc_sustento_raw,
            contribuyenteRuc: contribuyenteRuc,
          });

          // Debug: mostrar ventas disponibles del contribuyente
          const { data: ventasDisponibles } = await supabase
            .from("ventas")
            .select("id, numero_comprobante, fecha_emision")
            .eq("contribuyente_ruc", contribuyenteRuc)
            .is("retencion_id", null)
            .limit(10);
          console.log("Ventas disponibles (sin retención) del contribuyente:", ventasDisponibles);

          // Intentar con el formato transformado (001-100-000000027)
          let { data: venta } = await supabase
            .from("ventas")
            .select("id, numero_comprobante")
            .eq("numero_comprobante", retencion.num_doc_sustento)
            .eq("contribuyente_ruc", contribuyenteRuc)
            .is("retencion_id", null)
            .maybeSingle();

          console.log("Búsqueda formato con guiones:", venta);

          // Si no encuentra, intentar con el formato raw (001100000000027)
          if (!venta && retencion.num_doc_sustento_raw) {
            const result = await supabase
              .from("ventas")
              .select("id, numero_comprobante")
              .eq("numero_comprobante", retencion.num_doc_sustento_raw)
              .eq("contribuyente_ruc", contribuyenteRuc)
              .is("retencion_id", null)
              .maybeSingle();
            venta = result.data;
            console.log("Búsqueda formato sin guiones:", venta);
          }

          // Si aún no encuentra, intentar buscando por coincidencia parcial (últimos 9 dígitos)
          if (!venta && retencion.num_doc_sustento_raw) {
            const secuencial = retencion.num_doc_sustento_raw.slice(-9);
            console.log("Buscando por secuencial:", secuencial);
            
            const { data: ventas } = await supabase
              .from("ventas")
              .select("id, numero_comprobante")
              .eq("contribuyente_ruc", contribuyenteRuc)
              .is("retencion_id", null)
              .ilike("numero_comprobante", `%${secuencial}`);
            
            console.log("Ventas encontradas por secuencial:", ventas);
            
            if (ventas && ventas.length === 1) {
              venta = ventas[0];
            }
          }

          if (venta) {
            console.log("Venta encontrada:", venta);
            ventaEncontrada = true;
            ventaId = venta.id;
          } else {
            console.log("No se encontró venta para:", retencion.num_doc_sustento);
          }
        }

        retencionesConInfo.push({
          ...retencion,
          fileName: result.fileName || "Archivo desconocido",
          ventaEncontrada,
          ventaId,
          yaExiste,
        });
      }

      setRetencionesParsed(retencionesConInfo);

      if (retencionesConInfo.length > 0) {
        setStep("preview");
        const nuevas = retencionesConInfo.filter((r) => !r.yaExiste);
        const vinculadas = nuevas.filter((r) => r.ventaEncontrada);
        toast.success(
          `${nuevas.length} retención(es) nueva(s), ${vinculadas.length} con venta encontrada`
        );
      }
    } catch (error) {
      console.error("Error al procesar archivos:", error);
      toast.error("Error al procesar los archivos");
    }
  };

  const handleImportar = async () => {
    const retencionesNuevas = retencionesParsed.filter((r) => !r.yaExiste);

    if (retencionesNuevas.length === 0) {
      toast.warning("No hay retenciones nuevas para importar");
      return;
    }

    setStep("importing");
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
    setLinkedCount(0);

    let imported = 0;
    let errors = 0;
    let linked = 0;

    for (let i = 0; i < retencionesNuevas.length; i++) {
      const retencion = retencionesNuevas[i];

      try {
        // Insertar la retención
        const { data: insertedRetencion, error: insertError } = await supabase
          .from("retenciones")
          .insert({
            contribuyente_ruc: contribuyenteRuc,
            tipo_comprobante: retencion.tipo_comprobante,
            serie_comprobante: retencion.serie_comprobante,
            clave_acceso: retencion.clave_acceso,
            fecha_emision: retencion.fecha_emision,
            retencion_iva_percent: retencion.retencion_iva_percent,
            retencion_valor: retencion.retencion_valor,
            retencion_renta_percent: retencion.retencion_renta_percent,
            retencion_renta_valor: retencion.retencion_renta_valor,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Error insertando retención:", insertError);
          errors++;
        } else {
          imported++;

          // Si hay una venta vinculada, actualizar la referencia
          if (retencion.ventaEncontrada && retencion.ventaId && insertedRetencion) {
            // Primero verificar que la venta sigue disponible (sin retención)
            const { data: ventaDisponible } = await supabase
              .from("ventas")
              .select("id")
              .eq("id", retencion.ventaId)
              .is("retencion_id", null)
              .maybeSingle();

            if (ventaDisponible) {
              const { error: updateError } = await supabase
                .from("ventas")
                .update({ retencion_id: insertedRetencion.id })
                .eq("id", retencion.ventaId);

              if (!updateError) {
                linked++;
              } else {
                console.error("Error vinculando venta:", updateError);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error procesando retención:", error);
        errors++;
      }

      const progressValue = ((i + 1) / retencionesNuevas.length) * 100;
      setProgress(progressValue);
      setImportedCount(imported);
      setErrorCount(errors);
      setLinkedCount(linked);

      // Pequeña pausa para actualizar la UI
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    setStep("complete");

    if (errors === 0) {
      toast.success(
        `${imported} retención(es) importada(s), ${linked} vinculada(s) a ventas`
      );
    } else {
      toast.warning(
        `${imported} importada(s), ${errors} error(es), ${linked} vinculada(s)`
      );
    }
  };

  const handleClose = () => {
    setStep("upload");
    setRetencionesParsed([]);
    setParseErrors([]);
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
    setLinkedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);

    if (step === "complete" && importedCount > 0) {
      onRetencionesImportadas();
    }
  };

  const retencionesNuevas = retencionesParsed.filter((r) => !r.yaExiste);
  const retencionesExistentes = retencionesParsed.filter((r) => r.yaExiste);
  const retencionesVinculadas = retencionesNuevas.filter((r) => r.ventaEncontrada);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Retenciones desde XML
          </DialogTitle>
          <DialogDescription>
            Sube archivos XML de retenciones del SRI para importarlos y vincularlos
            automáticamente con sus ventas correspondientes
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Formato del archivo</AlertTitle>
              <AlertDescription>
                Sube los archivos XML de retenciones electrónicas. El sistema
                extraerá automáticamente los datos y buscará las ventas
                correspondientes para vincularlas.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-retenciones"
              />
              <label
                htmlFor="file-upload-retenciones"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Haz clic para seleccionar archivos
                </span>
                <span className="text-xs text-muted-foreground">
                  Formato: .XML (Puedes seleccionar múltiples archivos)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{retencionesNuevas.length}</p>
                <p className="text-xs text-muted-foreground">Nuevas</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {retencionesVinculadas.length}
                </p>
                <p className="text-xs text-muted-foreground">Con venta encontrada</p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {retencionesExistentes.length}
                </p>
                <p className="text-xs text-muted-foreground">Ya existentes</p>
              </div>
            </div>

            {/* Errores de parseo */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive" className="flex-shrink-0">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errores de parseo ({parseErrors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 text-sm">
                    {parseErrors.map((err, idx) => (
                      <li key={idx}>
                        {err.fileName}: {err.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Tabla de retenciones */}
            <div className="border rounded-lg flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Archivo</TableHead>
                    <TableHead className="min-w-[120px]">Serie</TableHead>
                    <TableHead className="min-w-[100px]">Fecha</TableHead>
                    <TableHead className="text-right min-w-[100px]">IVA</TableHead>
                    <TableHead className="text-right min-w-[100px]">Renta</TableHead>
                    <TableHead className="text-right min-w-[100px]">Total</TableHead>
                    <TableHead className="min-w-[150px]">Factura</TableHead>
                    <TableHead className="min-w-[100px]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retencionesParsed.map((retencion, idx) => (
                    <TableRow
                      key={idx}
                      className={retencion.yaExiste ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[130px]" title={retencion.fileName}>
                            {retencion.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {retencion.serie_comprobante}
                      </TableCell>
                      <TableCell className="text-sm">
                        {retencion.fecha_emision}
                      </TableCell>
                      <TableCell className="text-right">
                        {retencion.retencion_valor
                          ? formatearMoneda(retencion.retencion_valor)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {retencion.retencion_renta_valor
                          ? formatearMoneda(retencion.retencion_renta_valor)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatearMoneda(calcularTotalRetencion(retencion))}
                      </TableCell>
                      <TableCell>
                        {retencion.num_doc_sustento ? (
                          <div className="flex items-center gap-1">
                            {retencion.ventaEncontrada ? (
                              <Link2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Link2Off className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-mono text-xs">
                              {retencion.num_doc_sustento}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Sin factura
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {retencion.yaExiste ? (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Existente
                          </Badge>
                        ) : retencion.ventaEncontrada ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Vinculable
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Nueva
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="space-y-4">
            <Alert>
              <Receipt className="h-4 w-4" />
              <AlertTitle>Importando retenciones</AlertTitle>
              <AlertDescription>
                Por favor espera mientras se importan las retenciones y se
                vinculan con las ventas...
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {importedCount} de {retencionesNuevas.length} importadas
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">
                  {linkedCount} vinculada(s)
                </span>
                {errorCount > 0 && (
                  <span className="text-destructive">{errorCount} error(es)</span>
                )}
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
                Se han importado las retenciones exitosamente.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Importadas</p>
                <p className="text-2xl font-bold">{importedCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Vinculadas</p>
                <p className="text-2xl font-bold text-green-600">{linkedCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Errores</p>
                <p className="text-2xl font-bold text-destructive">{errorCount}</p>
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

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={retencionesNuevas.length === 0}
              >
                Importar {retencionesNuevas.length} retención(es)
              </Button>
            </>
          )}

          {step === "importing" && (
            <Button disabled>Importando retenciones...</Button>
          )}

          {step === "complete" && <Button onClick={handleClose}>Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

