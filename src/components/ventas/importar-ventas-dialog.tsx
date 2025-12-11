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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  parsearArchivoVentas,
  calcularResumenVentas,
  calcularSubtotalEIVA,
  VentaParsed,
  VentasResumen,
  TasaIVA,
} from "@/lib/ventas-parser";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calculator,
  FileSpreadsheet,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface ImportarVentasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuyenteRuc: string;
  onVentasImportadas: () => void;
}

type Step = "upload" | "preview" | "importing" | "complete";

const TASAS_IVA: { value: TasaIVA; label: string; description: string }[] = [
  { value: 0, label: "0%", description: "Bienes y servicios exentos de IVA" },
  { value: 8, label: "8%", description: "Tarifa reducida (canasta básica)" },
  { value: 12, label: "12%", description: "Tarifa anterior estándar" },
  { value: 15, label: "15%", description: "Tarifa vigente desde abril 2024" },
];

export function ImportarVentasDialog({
  open,
  onOpenChange,
  contribuyenteRuc,
  onVentasImportadas,
}: ImportarVentasDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [tasaIVA, setTasaIVA] = useState<TasaIVA>(15);
  const [ventasParsed, setVentasParsed] = useState<VentaParsed[]>([]);
  const [resumen, setResumen] = useState<VentasResumen | null>(null);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [fileContent, setFileContent] = useState<string>("");
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
      setFileContent(contenido);
      
      // Parsear con la tasa de IVA seleccionada
      const ventas = parsearArchivoVentas(contenido, tasaIVA);

      if (ventas.length === 0) {
        toast.error("No se encontraron ventas en el archivo");
        return;
      }

      setVentasParsed(ventas);
      setResumen(calcularResumenVentas(ventas, tasaIVA));
      setStep("preview");
      
      toast.success(`${ventas.length} ventas encontradas en el archivo`);
    } catch (error: unknown) {
      console.error("Error al parsear archivo:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al procesar archivo: ${message}`);
    }
  };

  const handleTasaIVAChange = (value: string) => {
    const nuevaTasa = parseInt(value) as TasaIVA;
    setTasaIVA(nuevaTasa);

    // Si ya hay archivo cargado, recalcular
    if (fileContent && ventasParsed.length > 0) {
      const ventasRecalculadas = ventasParsed.map((venta) => {
        const { subtotal, iva } = calcularSubtotalEIVA(venta.total, nuevaTasa);
        return {
          ...venta,
          subtotal,
          iva,
        };
      });
      setVentasParsed(ventasRecalculadas);
      setResumen(calcularResumenVentas(ventasRecalculadas, nuevaTasa));
    }
  };

  const handleImportar = async () => {
    setStep("importing");
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);

    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < ventasParsed.length; i += batchSize) {
      const batch = ventasParsed.slice(i, i + batchSize);

      try {
        // Preparar datos para insertar según la estructura de la tabla ventas
        const ventasParaInsertar = batch.map((venta) => ({
          contribuyente_ruc: contribuyenteRuc,
          ruc_cliente: venta.ruc_cliente,
          razon_social_cliente: venta.razon_social_cliente,
          fecha_emision: venta.fecha_emision,
          tipo_comprobante: venta.tipo_comprobante,
          numero_comprobante: venta.numero_comprobante,
          // Distribuir el subtotal según la tasa de IVA
          subtotal_0: tasaIVA === 0 ? venta.subtotal : 0,
          subtotal_8: tasaIVA === 8 ? venta.subtotal : 0,
          subtotal_15: tasaIVA === 15 || tasaIVA === 12 ? venta.subtotal : 0,
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

      // Actualizar progreso
      const progressValue = ((i + batch.length) / ventasParsed.length) * 100;
      setProgress(progressValue);
      setImportedCount(imported);
      setErrorCount(errors);

      // Pequeña pausa para no saturar la API
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
    // Reset state
    setStep("upload");
    setVentasParsed([]);
    setResumen(null);
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
    setFileContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);

    if (step === "complete") {
      onVentasImportadas();
    }
  };

  const handleVolver = () => {
    setStep("upload");
  };

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const formatearFecha = (fecha: string): string => {
    return dayjs(fecha).format("DD/MM/YYYY");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Ventas desde TXT
          </DialogTitle>
          <DialogDescription>
            Sube un archivo de ventas del SRI y selecciona el porcentaje de IVA aplicable
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload y selección de IVA */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Selección de tasa de IVA */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">
                  Selecciona la tasa de IVA para calcular
                </Label>
              </div>
              
              <RadioGroup
                value={tasaIVA.toString()}
                onValueChange={handleTasaIVAChange}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {TASAS_IVA.map((tasa) => (
                  <div key={tasa.value} className="relative">
                    <RadioGroupItem
                      value={tasa.value.toString()}
                      id={`iva-${tasa.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`iva-${tasa.value}`}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-2xl font-bold">{tasa.label}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {tasa.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Formato del archivo</AlertTitle>
              <AlertDescription>
                Sube el archivo TXT de ventas descargado del portal del SRI.
                El archivo debe tener columnas separadas por tabuladores con: 
                Fecha, Comprobante, Número, Identificación Receptor, Razón Social, Clave de Acceso y Valor Total.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
                id="ventas-file-upload"
              />
              <label
                htmlFor="ventas-file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Haz clic para seleccionar el archivo de ventas
                </span>
                <span className="text-xs text-muted-foreground">
                  Formato: .TXT (delimitado por tabuladores)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && resumen && (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg flex-shrink-0">
              <div>
                <p className="text-sm text-muted-foreground">Ventas encontradas</p>
                <p className="text-2xl font-bold">{resumen.cantidad}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-xl font-semibold">{formatearMoneda(resumen.subtotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IVA ({tasaIVA}%)</p>
                <p className="text-xl font-semibold text-primary">{formatearMoneda(resumen.iva)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{formatearMoneda(resumen.total)}</p>
              </div>
            </div>

            {/* Selector de IVA para recalcular */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-sm font-medium">Tasa de IVA:</span>
              <RadioGroup
                value={tasaIVA.toString()}
                onValueChange={handleTasaIVAChange}
                className="flex gap-4"
              >
                {TASAS_IVA.map((tasa) => (
                  <div key={tasa.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={tasa.value.toString()}
                      id={`preview-iva-${tasa.value}`}
                    />
                    <Label
                      htmlFor={`preview-iva-${tasa.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {tasa.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Alert className="flex-shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Vista previa de datos</AlertTitle>
              <AlertDescription>
                Revisa los datos antes de importar. El subtotal e IVA se calculan automáticamente 
                según la tasa seleccionada ({tasaIVA}%).
              </AlertDescription>
            </Alert>

            {/* Tabla de preview */}
            <div className="border rounded-lg flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasParsed.slice(0, 100).map((venta, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap">
                        {formatearFecha(venta.fecha_emision)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {venta.tipo_comprobante === "factura"
                            ? "Factura"
                            : venta.tipo_comprobante}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {venta.numero_comprobante}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[200px]">
                          <span className="text-sm truncate">
                            {venta.razon_social_cliente}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {venta.ruc_cliente}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatearMoneda(venta.subtotal)}
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        {formatearMoneda(venta.iva)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatearMoneda(venta.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold">
                      TOTALES
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatearMoneda(resumen.subtotal)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatearMoneda(resumen.iva)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatearMoneda(resumen.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {ventasParsed.length > 100 && (
              <p className="text-sm text-muted-foreground text-center flex-shrink-0">
                Mostrando las primeras 100 de {ventasParsed.length} ventas
              </p>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Importando ventas</AlertTitle>
              <AlertDescription>
                Por favor espera mientras se guardan las ventas en la base de datos...
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {importedCount} de {ventasParsed.length} importadas
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

        {/* Step 4: Complete */}
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Ventas importadas</p>
                <p className="text-2xl font-bold">{importedCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasa IVA aplicada</p>
                <p className="text-2xl font-bold">{tasaIVA}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-xl font-semibold">{resumen && formatearMoneda(resumen.subtotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IVA calculado</p>
                <p className="text-xl font-semibold text-primary">{resumen && formatearMoneda(resumen.iva)}</p>
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
              <Button variant="outline" onClick={handleVolver}>
                Volver
              </Button>
              <Button onClick={handleImportar}>
                <Upload className="mr-2 h-4 w-4" />
                Importar {ventasParsed.length} Ventas
              </Button>
            </>
          )}

          {step === "importing" && (
            <Button disabled>
              Importando ventas...
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

