"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Retencion, Venta } from "@/lib/supabase";
import { Receipt } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface DetalleRetencionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retencion: Retencion;
}

export function DetalleRetencionDialog({
  open,
  onOpenChange,
  retencion,
}: DetalleRetencionDialogProps) {
  const [venta, setVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formatear moneda
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  // Cargar venta asociada
  useEffect(() => {
    const cargarVenta = async () => {
      if (!open) {
        setVenta(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("ventas")
          .select("*")
          .eq("retencion_id", retencion.id)
          .single();

        if (error) {
          console.error("Error de Supabase al cargar venta:", error);
          setError(error.message || "No se pudo cargar la venta asociada");
          setVenta(null);
          return;
        }

        if (data) {
          setVenta(data);
          setError(null);
        }
      } catch (error) {
        console.error("Error al cargar venta:", error);
        setError("Error inesperado al cargar la venta asociada");
        setVenta(null);
      } finally {
        setLoading(false);
      }
    };

    cargarVenta();
  }, [retencion.id, open]);

  const totalRetencion =
    (retencion.retencion_valor || 0) + (retencion.retencion_renta_valor || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Detalle de Retención
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la Retención */}
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Retención
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary"
                  >
                    {retencion.tipo_comprobante || "retención"}
                  </Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Serie de Comprobante
                    </p>
                    <p className="font-semibold text-primary">
                      {retencion.serie_comprobante || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Fecha de Emisión
                    </p>
                    <p className="font-semibold">
                      {dayjs(retencion.fecha_emision).format("DD/MM/YYYY")}
                    </p>
                  </div>
                </div>

                {retencion.clave_acceso && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Clave de Acceso
                    </p>
                    <p className="font-mono text-xs break-all">
                      {retencion.clave_acceso}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Retención IVA:</span>
                    <span className="font-medium">
                      {retencion.retencion_iva_percent
                        ? `${retencion.retencion_iva_percent}%`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Valor IVA:</span>
                    <span className="font-medium text-info">
                      {retencion.retencion_valor
                        ? formatearMoneda(retencion.retencion_valor)
                        : "-"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm">Retención Renta:</span>
                    <span className="font-medium">
                      {retencion.retencion_renta_percent
                        ? `${retencion.retencion_renta_percent}%`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Valor Renta:</span>
                    <span className="font-medium text-primary">
                      {retencion.retencion_renta_valor
                        ? formatearMoneda(retencion.retencion_renta_valor)
                        : "-"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-lg font-semibold">Total Retenido:</span>
                    <span className="text-2xl font-semibold text-primary">
                      {formatearMoneda(totalRetencion)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venta Asociada */}
          {loading && (
            <Card className="border border-border/60 bg-card/80 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Cargando venta asociada...
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border border-destructive/40 bg-destructive/10 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-center text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {venta && !loading && !error && (
            <Card className="border border-border/60 bg-card/80 shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Venta Asociada
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary"
                    >
                      {venta.tipo_comprobante}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Número de Comprobante
                      </p>
                      <p className="font-semibold text-primary">
                        {venta.numero_comprobante}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Fecha de Emisión
                      </p>
                      <p className="font-semibold">
                        {dayjs(venta.fecha_emision).format("DD/MM/YYYY")}
                      </p>
                    </div>
                  </div>

                  {venta.razon_social_cliente && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-semibold">
                        {venta.razon_social_cliente}
                      </p>
                      {venta.ruc_cliente && (
                        <p className="text-sm text-muted-foreground">
                          RUC: {venta.ruc_cliente}
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal 0%:</span>
                      <span className="font-medium">
                        {formatearMoneda(venta.subtotal_0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal 8%:</span>
                      <span className="font-medium">
                        {formatearMoneda(venta.subtotal_8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal 15%:</span>
                      <span className="font-medium">
                        {formatearMoneda(venta.subtotal_15)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">IVA:</span>
                      <span className="font-medium">
                        {formatearMoneda(venta.iva)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-semibold">Total Original:</span>
                      <span className="text-xl font-semibold text-primary">
                        {formatearMoneda(venta.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cálculo Final - Solo si hay venta asociada */}
          {venta && !loading && !error && (
            <Card className="rounded-xl border border-primary/25 bg-primary/5 shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Resumen Final</h3>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Original</span>
                      <span className="font-mono font-semibold text-primary">
                        {formatearMoneda(venta.total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">(-) Retención</span>
                      <span className="font-mono text-primary">
                        -{formatearMoneda(totalRetencion)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-3">
                      <span className="text-base font-semibold">Saldo</span>
                      <span className="font-mono text-2xl font-semibold text-success">
                        {formatearMoneda(venta.total - totalRetencion)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
