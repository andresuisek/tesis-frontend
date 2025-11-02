"use client";

import { useState } from "react";
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
import { TipoComprobante } from "@/lib/supabase";
import { toast } from "sonner";

interface NuevaVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVentaCreada: () => void;
  contribuyenteRuc: string;
}

export function NuevaVentaDialog({
  open,
  onOpenChange,
  onVentaCreada,
  contribuyenteRuc,
}: NuevaVentaDialogProps) {
  const [loading, setLoading] = useState(false);

  // Estados del formulario
  const [rucCliente, setRucCliente] = useState("");
  const [razonSocialCliente, setRazonSocialCliente] = useState("");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tipoComprobante, setTipoComprobante] =
    useState<TipoComprobante>("factura");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [porcentajeIva, setPorcentajeIva] = useState<"0" | "8" | "15">("15");

  // Cálculos automáticos
  const subtotalNum = parseFloat(subtotal) || 0;
  const ivaCalculado =
    porcentajeIva === "0"
      ? 0
      : porcentajeIva === "8"
      ? subtotalNum * 0.08
      : subtotalNum * 0.15;
  const totalCalculado = subtotalNum + ivaCalculado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { supabase } = await import("@/lib/supabase");

      // Preparar los datos según el porcentaje de IVA seleccionado
      const ventaData = {
        contribuyente_ruc: contribuyenteRuc,
        ruc_cliente: rucCliente || null,
        razon_social_cliente: razonSocialCliente || null,
        fecha_emision: fechaEmision,
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante,
        subtotal_0: porcentajeIva === "0" ? subtotalNum : 0,
        subtotal_8: porcentajeIva === "8" ? subtotalNum : 0,
        subtotal_15: porcentajeIva === "15" ? subtotalNum : 0,
        iva: ivaCalculado,
        total: totalCalculado,
      };

      const { error } = await supabase.from("ventas").insert([ventaData]);

      if (error) throw error;

      toast.success("Venta registrada exitosamente");
      onVentaCreada();
      handleClose();
    } catch (error) {
      console.error("Error al crear venta:", error);
      toast.error("Error al registrar la venta");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Resetear el formulario
    setRucCliente("");
    setRazonSocialCliente("");
    setFechaEmision(new Date().toISOString().split("T")[0]);
    setTipoComprobante("factura");
    setNumeroComprobante("");
    setSubtotal("");
    setPorcentajeIva("15");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva Venta</DialogTitle>
            <DialogDescription>
              Registra una nueva factura o documento de venta
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Información del Cliente */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Información del Cliente</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruc-cliente">RUC Cliente</Label>
                  <Input
                    id="ruc-cliente"
                    placeholder="1234567890001"
                    maxLength={13}
                    value={rucCliente}
                    onChange={(e) => setRucCliente(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razon-social">Razón Social</Label>
                  <Input
                    id="razon-social"
                    placeholder="Nombre del cliente"
                    value={razonSocialCliente}
                    onChange={(e) => setRazonSocialCliente(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Información del Comprobante */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Información del Comprobante
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha-emision">
                    Fecha de Emisión <span className="text-destructive">*</span>
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
                  <Label htmlFor="tipo-comprobante">
                    Tipo de Comprobante <span className="text-destructive">*</span>
                  </Label>
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
                      <SelectItem value="factura">Factura</SelectItem>
                      <SelectItem value="nota_credito">
                        Nota de Crédito
                      </SelectItem>
                      <SelectItem value="liquidacion_compra">
                        Liquidación de Compra
                      </SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero-comprobante">
                  Número de Comprobante <span className="text-destructive">*</span>
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

            {/* Valores */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Valores</h4>
              <div className="space-y-2">
                <Label htmlFor="subtotal">
                  Subtotal <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                />
              </div>

              {/* Radio Buttons para IVA */}
              <div className="space-y-2">
                <Label>
                  Porcentaje de IVA <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="iva-0"
                      name="iva"
                      value="0"
                      checked={porcentajeIva === "0"}
                      onChange={(e) =>
                        setPorcentajeIva(e.target.value as "0" | "8" | "15")
                      }
                      className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <Label htmlFor="iva-0" className="cursor-pointer">
                      0%
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="iva-8"
                      name="iva"
                      value="8"
                      checked={porcentajeIva === "8"}
                      onChange={(e) =>
                        setPorcentajeIva(e.target.value as "0" | "8" | "15")
                      }
                      className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <Label htmlFor="iva-8" className="cursor-pointer">
                      8%
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="iva-15"
                      name="iva"
                      value="15"
                      checked={porcentajeIva === "15"}
                      onChange={(e) =>
                        setPorcentajeIva(e.target.value as "0" | "8" | "15")
                      }
                      className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <Label htmlFor="iva-15" className="cursor-pointer">
                      15%
                    </Label>
                  </div>
                </div>
              </div>

              {/* Resumen de Cálculos */}
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">${subtotalNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA ({porcentajeIva}%):</span>
                  <span className="font-medium text-info">
                    ${ivaCalculado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-success">
                    ${totalCalculado.toFixed(2)}
                  </span>
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
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
