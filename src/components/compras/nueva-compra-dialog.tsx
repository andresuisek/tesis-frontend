"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, RubroCompra, TipoComprobante } from "@/lib/supabase";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

interface NuevaCompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuyenteRuc: string;
  onCompraCreada: () => void;
}

// Mapeo de rubros a etiquetas legibles
const rubrosCompra: { value: RubroCompra; label: string }[] = [
  { value: "vivienda", label: "Vivienda" },
  { value: "alimentacion", label: "Alimentación" },
  { value: "salud", label: "Salud" },
  { value: "educacion", label: "Educación" },
  { value: "vestimenta", label: "Vestimenta" },
  { value: "turismo", label: "Turismo" },
  { value: "actividad_profesional", label: "Actividad Profesional" },
];

const tiposComprobante: { value: TipoComprobante; label: string }[] = [
  { value: "factura", label: "Factura" },
  { value: "liquidacion_compra", label: "Liquidación de Compra" },
  { value: "otros", label: "Otros" },
];

export function NuevaCompraDialog({
  open,
  onOpenChange,
  contribuyenteRuc,
  onCompraCreada,
}: NuevaCompraDialogProps) {
  const [loading, setLoading] = useState(false);
  const [rucProveedor, setRucProveedor] = useState("");
  const [razonSocialProveedor, setRazonSocialProveedor] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>("factura");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [claveAcceso, setClaveAcceso] = useState("");
  const [rubro, setRubro] = useState<RubroCompra>("alimentacion");
  const [valorSinImpuesto, setValorSinImpuesto] = useState("0");
  const [subtotal0, setSubtotal0] = useState("0");
  const [subtotal8, setSubtotal8] = useState("0");
  const [subtotal15, setSubtotal15] = useState("0");
  const [ivaPercentage, setIvaPercentage] = useState<"0" | "8" | "15">("15");

  // Calcular IVA y total
  const calcularIva = () => {
    const sub0 = parseFloat(subtotal0) || 0;
    const sub8 = parseFloat(subtotal8) || 0;
    const sub15 = parseFloat(subtotal15) || 0;
    return sub8 * 0.08 + sub15 * 0.15;
  };

  const calcularTotal = () => {
    const sub0 = parseFloat(subtotal0) || 0;
    const sub8 = parseFloat(subtotal8) || 0;
    const sub15 = parseFloat(subtotal15) || 0;
    return sub0 + sub8 + sub15 + calcularIva();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (!fechaEmision) {
        toast.error("La fecha de emisión es requerida");
        return;
      }
      if (!numeroComprobante) {
        toast.error("El número de comprobante es requerido");
        return;
      }
      if (!claveAcceso) {
        toast.error("La clave de acceso es requerida");
        return;
      }

      const iva = calcularIva();
      const total = calcularTotal();

      const { error } = await supabase.from("compras").insert({
        contribuyente_ruc: contribuyenteRuc,
        ruc_proveedor: rucProveedor || null,
        razon_social_proveedor: razonSocialProveedor || null,
        fecha_emision: fechaEmision,
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante,
        clave_acceso: claveAcceso,
        rubro: rubro,
        valor_sin_impuesto: parseFloat(valorSinImpuesto) || 0,
        subtotal_0: parseFloat(subtotal0) || 0,
        subtotal_8: parseFloat(subtotal8) || 0,
        subtotal_15: parseFloat(subtotal15) || 0,
        iva: iva,
        total: total,
      });

      if (error) throw error;

      toast.success("Compra registrada exitosamente");
      onCompraCreada();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error al crear compra:", error);
      toast.error(`Error al crear compra: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRucProveedor("");
    setRazonSocialProveedor("");
    setFechaEmision("");
    setTipoComprobante("factura");
    setNumeroComprobante("");
    setClaveAcceso("");
    setRubro("alimentacion");
    setValorSinImpuesto("0");
    setSubtotal0("0");
    setSubtotal8("0");
    setSubtotal15("0");
    setIvaPercentage("15");
  };

  // Actualizar subtotales según el porcentaje de IVA seleccionado
  const handleIvaPercentageChange = (value: "0" | "8" | "15") => {
    setIvaPercentage(value);
    // Resetear subtotales
    setSubtotal0("0");
    setSubtotal8("0");
    setSubtotal15("0");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nueva Compra
          </DialogTitle>
          <DialogDescription>
            Registra una nueva compra manualmente. Completa todos los campos
            requeridos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datos del Proveedor */}
          <div className="space-y-2">
            <Label htmlFor="rucProveedor">RUC Proveedor (opcional)</Label>
            <Input
              id="rucProveedor"
              value={rucProveedor}
              onChange={(e) => setRucProveedor(e.target.value)}
              placeholder="1234567890001"
              maxLength={13}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="razonSocialProveedor">
              Razón Social Proveedor (opcional)
            </Label>
            <Input
              id="razonSocialProveedor"
              value={razonSocialProveedor}
              onChange={(e) => setRazonSocialProveedor(e.target.value)}
              placeholder="Nombre del proveedor"
            />
          </div>

          {/* Datos del Comprobante */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaEmision">
                Fecha de Emisión <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fechaEmision"
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoComprobante">Tipo de Comprobante</Label>
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
                  {tiposComprobante.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numeroComprobante">
              Número de Comprobante <span className="text-red-500">*</span>
            </Label>
            <Input
              id="numeroComprobante"
              value={numeroComprobante}
              onChange={(e) => setNumeroComprobante(e.target.value)}
              placeholder="001-001-000000001"
              required
            />
          </div>

          {/* Clave de Acceso */}
          <div className="space-y-2">
            <Label htmlFor="claveAcceso">
              Clave de Acceso <span className="text-red-500">*</span>
            </Label>
            <Input
              id="claveAcceso"
              value={claveAcceso}
              onChange={(e) => setClaveAcceso(e.target.value)}
              placeholder="49 dígitos"
              maxLength={49}
              required
            />
            <p className="text-xs text-muted-foreground">
              Ingresa la clave de acceso del comprobante electrónico (49 dígitos)
            </p>
          </div>

          {/* Rubro */}
          <div className="space-y-2">
            <Label htmlFor="rubro">
              Rubro <span className="text-red-500">*</span>
            </Label>
            <Select
              value={rubro}
              onValueChange={(value) => setRubro(value as RubroCompra)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rubrosCompra.map((rubroItem) => (
                  <SelectItem key={rubroItem.value} value={rubroItem.value}>
                    {rubroItem.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor sin impuesto */}
          <div className="space-y-2">
            <Label htmlFor="valorSinImpuesto">Valor sin Impuesto</Label>
            <Input
              id="valorSinImpuesto"
              type="number"
              step="0.01"
              value={valorSinImpuesto}
              onChange={(e) => setValorSinImpuesto(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Selección de porcentaje de IVA */}
          <div className="space-y-2">
            <Label>Porcentaje de IVA</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ivaPercentage"
                  value="0"
                  checked={ivaPercentage === "0"}
                  onChange={(e) =>
                    handleIvaPercentageChange(e.target.value as "0" | "8" | "15")
                  }
                  className="cursor-pointer"
                />
                <span>0%</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ivaPercentage"
                  value="8"
                  checked={ivaPercentage === "8"}
                  onChange={(e) =>
                    handleIvaPercentageChange(e.target.value as "0" | "8" | "15")
                  }
                  className="cursor-pointer"
                />
                <span>8%</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ivaPercentage"
                  value="15"
                  checked={ivaPercentage === "15"}
                  onChange={(e) =>
                    handleIvaPercentageChange(e.target.value as "0" | "8" | "15")
                  }
                  className="cursor-pointer"
                />
                <span>15%</span>
              </label>
            </div>
          </div>

          {/* Subtotales */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtotal0">Subtotal 0%</Label>
              <Input
                id="subtotal0"
                type="number"
                step="0.01"
                value={subtotal0}
                onChange={(e) => setSubtotal0(e.target.value)}
                disabled={ivaPercentage !== "0"}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtotal8">Subtotal 8%</Label>
              <Input
                id="subtotal8"
                type="number"
                step="0.01"
                value={subtotal8}
                onChange={(e) => setSubtotal8(e.target.value)}
                disabled={ivaPercentage !== "8"}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtotal15">Subtotal 15%</Label>
              <Input
                id="subtotal15"
                type="number"
                step="0.01"
                value={subtotal15}
                onChange={(e) => setSubtotal15(e.target.value)}
                disabled={ivaPercentage !== "15"}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Resumen */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>IVA:</span>
              <span className="font-medium">${calcularIva().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total:</span>
              <span>${calcularTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Compra"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

