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
import { supabase } from "@/lib/supabase";
import {
  parsearMultiplesXMLVentas,
  validarRucVentasXml,
  VentaXmlParsed,
  VentasXMLParseResult,
} from "@/lib/ventas-xml-parser";
import { toast } from "sonner";
import {
  Upload,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

interface ImportarVentasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuyenteRuc: string;
  onVentasImportadas: () => void;
}

type Step = "upload" | "parsing" | "preview" | "importing" | "complete";

export function ImportarVentasDialog({
  open,
  onOpenChange,
  contribuyenteRuc,
  onVentasImportadas,
}: ImportarVentasDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [ventasParsed, setVentasParsed] = useState<VentaXmlParsed[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [xmlParseResult, setXmlParseResult] =
    useState<VentasXMLParseResult | null>(null);
  const [duplicateClaves, setDuplicateClaves] = useState<Set<string>>(
    new Set()
  );
  const [rucWarning, setRucWarning] = useState<string | null>(null);

  const ventasParaImportar = useMemo(() => {
    if (duplicateClaves.size === 0) return ventasParsed;
    return ventasParsed.filter((v) => !duplicateClaves.has(v.clave_acceso));
  }, [ventasParsed, duplicateClaves]);

  const handleXmlFilesSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const xmlFiles = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".xml")
    );
    if (xmlFiles.length === 0) {
      toast.error("No se encontraron archivos XML válidos");
      return;
    }

    setStep("parsing");
    setProgress(0);

    try {
      const result = await parsearMultiplesXMLVentas(xmlFiles, (percent) => {
        setProgress(percent);
      });

      setXmlParseResult(result);

      if (result.ventas.length === 0) {
        toast.error("No se pudieron parsear ventas de los archivos XML");
        setStep("upload");
        return;
      }

      setVentasParsed(result.ventas);

      // Validate RUC
      const warning = validarRucVentasXml(result.ventas, contribuyenteRuc);
      setRucWarning(warning);

      // Check for duplicates by clave_acceso
      const clavesAcceso = result.ventas
        .map((v) => v.clave_acceso)
        .filter((c) => c && c.length > 0);

      if (clavesAcceso.length > 0) {
        const duplicadas = new Set<string>();
        const batchSize = 50;
        for (let i = 0; i < clavesAcceso.length; i += batchSize) {
          const batch = clavesAcceso.slice(i, i + batchSize);
          const { data } = await supabase
            .from("ventas")
            .select("clave_acceso")
            .eq("contribuyente_ruc", contribuyenteRuc)
            .in("clave_acceso", batch);

          if (data) {
            data.forEach((row: { clave_acceso: string }) => {
              duplicadas.add(row.clave_acceso);
            });
          }
        }
        setDuplicateClaves(duplicadas);
      }

      setStep("preview");
    } catch (error) {
      console.error("Error parseando XMLs:", error);
      toast.error("Error al procesar archivos XML");
      setStep("upload");
    }
  };

  const handleConfirmImport = async () => {
    if (ventasParaImportar.length === 0) {
      toast.error("No hay ventas nuevas para importar");
      return;
    }

    setStep("importing");
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);

    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < ventasParaImportar.length; i += batchSize) {
      const batch = ventasParaImportar.slice(i, i + batchSize);

      try {
        const ventasParaInsertar = batch.map((venta) => ({
          contribuyente_ruc: contribuyenteRuc,
          ruc_cliente: venta.ruc_cliente,
          razon_social_cliente: venta.razon_social_cliente,
          fecha_emision: venta.fecha_emision,
          tipo_comprobante: venta.tipo_comprobante,
          numero_comprobante: venta.numero_comprobante,
          clave_acceso: venta.clave_acceso,
          subtotal_0: venta.subtotal_0,
          subtotal_5: venta.subtotal_5,
          subtotal_8: venta.subtotal_8,
          subtotal_15: venta.subtotal_15,
          iva: venta.iva,
          total: venta.total,
        }));

        const { error } = await supabase
          .from("ventas")
          .insert(ventasParaInsertar);

        if (error) {
          console.error("Error insertando batch:", error);
          errors += batch.length;
        } else {
          imported += batch.length;
        }
      } catch (error: unknown) {
        console.error("Error en batch:", error);
        errors += batch.length;
      }

      const progressValue =
        ((i + batch.length) / ventasParaImportar.length) * 100;
      setProgress(progressValue);
      setImportedCount(imported);
      setErrorCount(errors);

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setStep("complete");

    if (errors === 0) {
      toast.success(`${imported} ventas importadas exitosamente`);
    } else {
      toast.warning(`${imported} ventas importadas, ${errors} fallaron`);
    }
  };

  const handleClose = () => {
    const wasComplete = step === "complete";
    setStep("upload");
    setVentasParsed([]);
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
    setXmlParseResult(null);
    setDuplicateClaves(new Set());
    setRucWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);

    if (wasComplete) {
      onVentasImportadas();
    }
  };

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Ventas desde XML
          </DialogTitle>
          <DialogDescription>
            Sube los archivos XML de facturas electrónicas de ventas del SRI
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <Alert>
              <FileCode2 className="h-4 w-4" />
              <AlertTitle>Facturas XML</AlertTitle>
              <AlertDescription>
                Sube los archivos XML de facturas electrónicas autorizadas del
                SRI. Puedes seleccionar múltiples archivos a la vez.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                multiple
                onChange={handleXmlFilesSelect}
                className="hidden"
                id="ventas-xml-upload"
              />
              <label
                htmlFor="ventas-xml-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Haz clic para seleccionar archivos XML
                </span>
                <span className="text-xs text-muted-foreground">
                  Formato: .XML (facturas electrónicas del SRI)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Parsing */}
        {step === "parsing" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Procesando archivos XML</AlertTitle>
              <AlertDescription>
                Por favor espera mientras se leen y parsean las facturas
                electrónicas...
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Parseando archivos...</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && xmlParseResult && (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg flex-shrink-0">
              <div>
                <p className="text-sm text-muted-foreground">
                  Parseadas correctamente
                </p>
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
                <p className="text-sm text-muted-foreground">
                  Omitidas (no autorizadas)
                </p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {xmlParseResult.skipped}
                </p>
              </div>
            </div>

            {/* RUC warning */}
            {rucWarning && (
              <Alert variant="destructive" className="flex-shrink-0">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Advertencia de RUC</AlertTitle>
                <AlertDescription>{rucWarning}</AlertDescription>
              </Alert>
            )}

            {/* Duplicate warning */}
            {duplicateClaves.size > 0 && (
              <Alert variant="destructive" className="flex-shrink-0">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Duplicados detectados</AlertTitle>
                <AlertDescription>
                  {duplicateClaves.size} factura
                  {duplicateClaves.size !== 1 ? "s" : ""} ya exist
                  {duplicateClaves.size !== 1 ? "en" : "e"} en la base de datos
                  y {duplicateClaves.size !== 1 ? "serán excluidas" : "será excluida"}{" "}
                  de la importación.
                </AlertDescription>
              </Alert>
            )}

            {/* Errors list */}
            {xmlParseResult.errores.length > 0 && (
              <div className="border rounded-lg p-3 max-h-[150px] overflow-auto flex-shrink-0">
                <p className="text-sm font-medium mb-2">Detalle de errores:</p>
                <ul className="space-y-1">
                  {xmlParseResult.errores.map((error, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview table */}
            {ventasParaImportar.length > 0 && (
              <div className="border rounded-lg flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Fecha</TableHead>
                      <TableHead className="min-w-[80px]">Tipo</TableHead>
                      <TableHead className="min-w-[140px]">
                        Comprobante
                      </TableHead>
                      <TableHead className="min-w-[180px]">Cliente</TableHead>
                      <TableHead className="text-right min-w-[90px]">
                        Subtotal
                      </TableHead>
                      <TableHead className="text-right min-w-[80px]">
                        IVA
                      </TableHead>
                      <TableHead className="text-right min-w-[100px]">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventasParaImportar.map((venta, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {venta.fecha_emision}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {venta.tipo_comprobante === "factura"
                              ? "Factura"
                              : venta.tipo_comprobante === "nota_credito"
                                ? "N. Crédito"
                                : venta.tipo_comprobante}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {venta.numero_comprobante}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col max-w-[170px]">
                            <span className="text-sm truncate">
                              {venta.razon_social_cliente}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {venta.ruc_cliente}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatearMoneda(
                            venta.subtotal_0 +
                              venta.subtotal_5 +
                              venta.subtotal_8 +
                              venta.subtotal_15
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatearMoneda(venta.iva)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatearMoneda(venta.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="font-bold">
                        TOTAL ({ventasParaImportar.length} venta
                        {ventasParaImportar.length !== 1 ? "s" : ""})
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatearMoneda(
                          ventasParaImportar.reduce(
                            (s, v) =>
                              s +
                              v.subtotal_0 +
                              v.subtotal_5 +
                              v.subtotal_8 +
                              v.subtotal_15,
                            0
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatearMoneda(
                          ventasParaImportar.reduce((s, v) => s + v.iva, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatearMoneda(
                          ventasParaImportar.reduce((s, v) => s + v.total, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Guardando ventas</AlertTitle>
              <AlertDescription>
                Por favor espera mientras se guardan las ventas en la base de
                datos...
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {importedCount} de {ventasParaImportar.length} guardadas
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

        {/* Step 5: Complete */}
        {step === "complete" && (
          <div className="space-y-4">
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Importación completada</AlertTitle>
              <AlertDescription>
                Se han importado {importedCount} ventas exitosamente
                {errorCount > 0 && ` (${errorCount} errores)`}.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ventas importadas
                </p>
                <p className="text-2xl font-bold">{importedCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total importado
                </p>
                <p className="text-xl font-semibold">
                  {formatearMoneda(
                    ventasParaImportar.reduce((s, v) => s + v.total, 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IVA total</p>
                <p className="text-xl font-semibold text-primary">
                  {formatearMoneda(
                    ventasParaImportar.reduce((s, v) => s + v.iva, 0)
                  )}
                </p>
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

          {step === "parsing" && (
            <Button disabled>Procesando archivos...</Button>
          )}

          {step === "preview" && (
            <div className="flex items-center gap-2 w-full justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setXmlParseResult(null);
                  setDuplicateClaves(new Set());
                  setRucWarning(null);
                  setVentasParsed([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                Volver
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={ventasParaImportar.length === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar {ventasParaImportar.length} venta
                {ventasParaImportar.length !== 1 ? "s" : ""}
              </Button>
            </div>
          )}

          {step === "importing" && (
            <Button disabled>Guardando ventas...</Button>
          )}

          {step === "complete" && (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
