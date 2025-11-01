"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Venta, TipoComprobante } from "@/lib/supabase";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface NuevaRetencionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetencionCreada: () => void;
  venta: Venta;
  contribuyenteRuc: string;
}

export function NuevaRetencionDialog({
  open,
  onOpenChange,
  onRetencionCreada,
  venta,
  contribuyenteRuc,
}: NuevaRetencionDialogProps) {
  const [loading, setLoading] = useState(false);

  // Estados del formulario
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tipoComprobante, setTipoComprobante] =
    useState<TipoComprobante>("retencion");
  const [serieComprobante, setSerieComprobante] = useState("");
  const [claveAcceso, setClaveAcceso] = useState("");
  const [retencionIvaPercent, setRetencionIvaPercent] = useState("");
  const [retencionRentaPercent, setRetencionRentaPercent] = useState("");

  // Cálculos automáticos basados en el IVA de la venta
  const ivaVenta = venta.iva;
  const retencionIvaPercentNum = parseFloat(retencionIvaPercent) || 0;
  const retencionRentaPercentNum = parseFloat(retencionRentaPercent) || 0;

  const retencionIvaValor = (ivaVenta * retencionIvaPercentNum) / 100;
  const retencionRentaValor = (venta.total * retencionRentaPercentNum) / 100;
  const totalRetencion = retencionIvaValor + retencionRentaValor;

  // Validar que no exceda el total de la venta
  const maxTotal = venta.total;
  const excedeLimite = totalRetencion > maxTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (excedeLimite) {
      toast.error(
        "El total de la retención no puede exceder el total de la venta"
      );
      return;
    }

    if (!serieComprobante.trim()) {
      toast.error("La serie del comprobante es requerida");
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import("@/lib/supabase");

      // 1. Crear la retención
      const retencionData = {
        contribuyente_ruc: contribuyenteRuc,
        fecha_emision: fechaEmision,
        tipo_comprobante: tipoComprobante,
        serie_comprobante: serieComprobante,
        clave_acceso: claveAcceso || null,
        retencion_iva_percent: retencionIvaPercentNum || null,
        retencion_valor: retencionIvaValor || null,
        retencion_renta_percent: retencionRentaPercentNum || null,
        retencion_renta_valor: retencionRentaValor || null,
      };

      const { data: retencion, error: errorRetencion } = await supabase
        .from("retenciones")
        .insert([retencionData])
        .select()
        .single();

      if (errorRetencion) throw errorRetencion;

      // 2. Actualizar la venta con el retencion_id
      const { error: errorVenta } = await supabase
        .from("ventas")
        .update({ retencion_id: retencion.id })
        .eq("id", venta.id);

      if (errorVenta) throw errorVenta;

      toast.success("Retención registrada exitosamente");
      resetForm();
      onOpenChange(false);
      onRetencionCreada();
    } catch (error) {
      console.error("Error al crear retención:", error);
      toast.error("Error al registrar la retención");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    // Resetear el formulario a valores iniciales
    setFechaEmision(new Date().toISOString().split("T")[0]);
    setTipoComprobante("retencion");
    setSerieComprobante("");
    setClaveAcceso("");
    setRetencionIvaPercent("");
    setRetencionRentaPercent("");
  };

  const handleClose = () => {
    // Solo resetear si el usuario no está editando
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva Retención</DialogTitle>
            <DialogDescription>
              Crear retención para la factura {venta.numero_comprobante}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Información de la Venta Original */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Venta Original</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Comprobante:</span>
                  <span className="ml-2 font-medium">
                    {venta.numero_comprobante}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="ml-2 font-medium">
                    {new Date(venta.fecha_emision).toLocaleDateString("es-EC")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">IVA:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    ${ivaVenta.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-bold text-green-600">
                    ${venta.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Información del Comprobante */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Información de la Retención
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha-emision">
                    Fecha de Emisión <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fecha-emision"
                    type="date"
                    required
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo-comprobante">Tipo de Comprobante</Label>
                  <Select
                    value={tipoComprobante}
                    onValueChange={(value) =>
                      setTipoComprobante(value as TipoComprobante)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retencion">Retención</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serie-comprobante">
                    Serie del Comprobante{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serie-comprobante"
                    placeholder="001-001-000123456"
                    required
                    value={serieComprobante}
                    onChange={(e) => setSerieComprobante(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clave-acceso">Clave de Acceso</Label>
                  <Input
                    id="clave-acceso"
                    placeholder="49 dígitos"
                    maxLength={49}
                    value={claveAcceso}
                    onChange={(e) => setClaveAcceso(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Retención IVA */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Retención de IVA</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retencion-iva-percent">Porcentaje (%)</Label>
                  <Input
                    id="retencion-iva-percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={retencionIvaPercent}
                    onChange={(e) => setRetencionIvaPercent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: 30, 70, 100
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Valor Calculado</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-lg font-bold text-orange-600">
                      ${retencionIvaValor.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Base IVA: ${ivaVenta.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Retención Renta */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Retención de Renta</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retencion-renta-percent">
                    Porcentaje (%)
                  </Label>
                  <Input
                    id="retencion-renta-percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={retencionRentaPercent}
                    onChange={(e) => setRetencionRentaPercent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: 1, 2, 8, 10
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Valor Calculado</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-lg font-bold text-purple-600">
                      ${retencionRentaValor.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Base Total: ${venta.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen de Cálculos */}
            <div
              className={`mt-4 p-4 rounded-lg space-y-2 ${
                excedeLimite ? "bg-red-50 border border-red-300" : "bg-muted"
              }`}
            >
              {excedeLimite && (
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    El total de retención excede el total de la venta
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Retención IVA:</span>
                <span className="font-medium text-orange-600">
                  ${retencionIvaValor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Retención Renta:</span>
                <span className="font-medium text-purple-600">
                  ${retencionRentaValor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span>Total Retención:</span>
                <span
                  className={excedeLimite ? "text-red-600" : "text-blue-600"}
                >
                  ${totalRetencion.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Límite máximo:</span>
                <span>${maxTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || excedeLimite}>
              {loading ? "Guardando..." : "Guardar Retención"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
