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
import { Venta } from "@/lib/supabase";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface NuevaNotaCreditoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotaCreditoCreada: () => void;
  venta: Venta;
  contribuyenteRuc: string;
}

export function NuevaNotaCreditoDialog({
  open,
  onOpenChange,
  onNotaCreditoCreada,
  venta,
  contribuyenteRuc,
}: NuevaNotaCreditoDialogProps) {
  const [loading, setLoading] = useState(false);

  // Estados del formulario
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [porcentajeIva, setPorcentajeIva] = useState<"0" | "8" | "15">(
    // Detectar el porcentaje de IVA de la venta original
    venta.subtotal_15 > 0 ? "15" : venta.subtotal_8 > 0 ? "8" : "0"
  );

  // Cálculos automáticos
  const subtotalNum = parseFloat(subtotal) || 0;
  const ivaCalculado =
    porcentajeIva === "0"
      ? 0
      : porcentajeIva === "8"
      ? subtotalNum * 0.08
      : subtotalNum * 0.15;
  const totalCalculado = subtotalNum + ivaCalculado;

  // Validar que no exceda el total de la venta
  const maxTotal = venta.total;
  const excedeLimite = totalCalculado > maxTotal;

  // Reset del formulario cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      // Resetear valores al abrir
      setFechaEmision(new Date().toISOString().split("T")[0]);
      setNumeroComprobante("");
      setSubtotal("");
      const ivaDefault =
        venta.subtotal_15 > 0 ? "15" : venta.subtotal_8 > 0 ? "8" : "0";
      setPorcentajeIva(ivaDefault);
    }
  }, [open, venta.subtotal_15, venta.subtotal_8]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (excedeLimite) {
      toast.error(
        "El monto de la nota de crédito no puede exceder el total de la venta"
      );
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import("@/lib/supabase");

      // 1. Crear la nota de crédito
      const notaCreditoData = {
        contribuyente_ruc: contribuyenteRuc,
        fecha_emision: fechaEmision,
        tipo_comprobante: "nota_credito" as const,
        numero_comprobante: numeroComprobante,
        subtotal_0: porcentajeIva === "0" ? subtotalNum : 0,
        subtotal_8: porcentajeIva === "8" ? subtotalNum : 0,
        subtotal_15: porcentajeIva === "15" ? subtotalNum : 0,
        iva: ivaCalculado,
        total: totalCalculado,
      };

      const { data: notaCredito, error: errorNotaCredito } = await supabase
        .from("notas_credito")
        .insert([notaCreditoData])
        .select()
        .single();

      if (errorNotaCredito) throw errorNotaCredito;

      // 2. Actualizar la venta con el nota_credito_id
      const { error: errorVenta } = await supabase
        .from("ventas")
        .update({ nota_credito_id: notaCredito.id })
        .eq("id", venta.id);

      if (errorVenta) throw errorVenta;

      toast.success("Nota de crédito registrada exitosamente");
      onNotaCreditoCreada();
      handleClose();
    } catch (error) {
      console.error("Error al crear nota de crédito:", error);
      toast.error("Error al registrar la nota de crédito");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Resetear el formulario
    setFechaEmision(new Date().toISOString().split("T")[0]);
    setNumeroComprobante("");
    setSubtotal("");
    setPorcentajeIva(
      venta.subtotal_15 > 0 ? "15" : venta.subtotal_8 > 0 ? "8" : "0"
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva Nota de Crédito</DialogTitle>
            <DialogDescription>
              Crear nota de crédito para la factura {venta.numero_comprobante}
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
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="ml-2 font-medium">
                    {venta.razon_social_cliente || "Sin cliente"}
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
                Información de la Nota de Crédito
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
                  <Label htmlFor="numero-comprobante">
                    Número de Comprobante{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="numero-comprobante"
                    placeholder="001-001-000123456"
                    required
                    value={numeroComprobante}
                    onChange={(e) => setNumeroComprobante(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Valores */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Valores</h4>
              <div className="space-y-2">
                <Label htmlFor="subtotal">
                  Subtotal <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxTotal}
                  placeholder="0.00"
                  required
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                />
              </div>

              {/* Radio Buttons para IVA */}
              <div className="space-y-2">
                <Label>
                  Porcentaje de IVA <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="iva-0-nc"
                      name="iva-nc"
                      value="0"
                      checked={porcentajeIva === "0"}
                      onChange={(e) =>
                        setPorcentajeIva(e.target.value as "0" | "8" | "15")
                      }
                      className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <Label htmlFor="iva-0-nc" className="cursor-pointer">
                      0%
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="iva-8-nc"
                      name="iva-nc"
                      value="8"
                      checked={porcentajeIva === "8"}
                      onChange={(e) =>
                        setPorcentajeIva(e.target.value as "0" | "8" | "15")
                      }
                      className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <Label htmlFor="iva-8-nc" className="cursor-pointer">
                      8%
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="iva-15-nc"
                      name="iva-nc"
                      value="15"
                      checked={porcentajeIva === "15"}
                      onChange={(e) =>
                        setPorcentajeIva(e.target.value as "0" | "8" | "15")
                      }
                      className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <Label htmlFor="iva-15-nc" className="cursor-pointer">
                      15%
                    </Label>
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
                      El monto excede el total de la venta
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">${subtotalNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA ({porcentajeIva}%):</span>
                  <span className="font-medium text-orange-600">
                    ${ivaCalculado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span
                    className={excedeLimite ? "text-red-600" : "text-green-600"}
                  >
                    ${totalCalculado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Límite máximo:</span>
                  <span>${maxTotal.toFixed(2)}</span>
                </div>
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
              {loading ? "Guardando..." : "Guardar Nota de Crédito"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
