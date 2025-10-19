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

    return () => {
      setVenta(null);
      setLoading(false);
      setError(null);
    };
  }, [retencion.id, open]);

  const totalRetencion =
    (retencion.retencion_valor || 0) + (retencion.retencion_renta_valor || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-500" />
            Detalle de Retención
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la Retención */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-purple-700">
                    Retención
                  </h3>
                  <Badge className="bg-purple-600">
                    {retencion.tipo_comprobante || "retención"}
                  </Badge>
                </div>

                <Separator className="bg-purple-200" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Serie de Comprobante
                    </p>
                    <p className="font-semibold text-purple-700">
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

                <Separator className="bg-purple-200" />

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
                    <span className="font-medium">
                      {retencion.retencion_valor
                        ? formatearMoneda(retencion.retencion_valor)
                        : "-"}
                    </span>
                  </div>
                  <Separator className="bg-purple-200" />
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
                    <span className="font-medium">
                      {retencion.retencion_renta_valor
                        ? formatearMoneda(retencion.retencion_renta_valor)
                        : "-"}
                    </span>
                  </div>
                  <Separator className="bg-purple-200" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-lg">Total Retenido:</span>
                    <span className="font-bold text-2xl text-purple-600">
                      {formatearMoneda(totalRetencion)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venta Asociada */}
          {loading && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Cargando venta asociada...
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="pt-6">
                <p className="text-center text-yellow-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {venta && !loading && !error && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-blue-700">
                      Venta Asociada
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-blue-500 text-blue-700"
                    >
                      {venta.tipo_comprobante}
                    </Badge>
                  </div>

                  <Separator className="bg-blue-200" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Número de Comprobante
                      </p>
                      <p className="font-semibold text-blue-700">
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

                  <Separator className="bg-blue-200" />

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
                    <Separator className="bg-blue-200" />
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-lg">Total Original:</span>
                      <span className="font-bold text-xl text-blue-600">
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
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-green-700">
                    Cálculo Final
                  </h3>
                  <Separator className="bg-green-200" />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Original:</span>
                      <span className="font-semibold">
                        {formatearMoneda(venta.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-purple-600">
                      <span className="text-sm">(-) Retención:</span>
                      <span className="font-semibold">
                        -{formatearMoneda(totalRetencion)}
                      </span>
                    </div>
                    <Separator className="bg-green-200" />
                    <div className="flex justify-between items-center pt-3 border-t-2 border-green-400">
                      <span className="font-bold text-lg">Saldo:</span>
                      <span className="font-bold text-2xl text-green-600">
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
