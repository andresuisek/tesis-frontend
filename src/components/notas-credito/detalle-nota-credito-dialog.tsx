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
import { NotaCredito, Venta } from "@/lib/supabase";
import { FileX, Receipt } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface DetalleNotaCreditoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notaCredito: NotaCredito;
}

export function DetalleNotaCreditoDialog({
  open,
  onOpenChange,
  notaCredito,
}: DetalleNotaCreditoDialogProps) {
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
          .eq("nota_credito_id", notaCredito.id)
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
  }, [notaCredito.id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-red-500" />
            Detalle de Nota de Crédito
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la Nota de Crédito */}
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-red-700">
                    Nota de Crédito
                  </h3>
                  <Badge variant="destructive">
                    {notaCredito.tipo_comprobante}
                  </Badge>
                </div>

                <Separator className="bg-red-200" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Número de Comprobante
                    </p>
                    <p className="font-semibold text-red-700">
                      {notaCredito.numero_comprobante}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Fecha de Emisión
                    </p>
                    <p className="font-semibold">
                      {dayjs(notaCredito.fecha_emision).format("DD/MM/YYYY")}
                    </p>
                  </div>
                </div>

                <Separator className="bg-red-200" />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal 0%:</span>
                    <span className="font-medium">
                      {formatearMoneda(notaCredito.subtotal_0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal 8%:</span>
                    <span className="font-medium">
                      {formatearMoneda(notaCredito.subtotal_8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal 15%:</span>
                    <span className="font-medium">
                      {formatearMoneda(notaCredito.subtotal_15)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">IVA:</span>
                    <span className="font-medium">
                      {formatearMoneda(notaCredito.iva)}
                    </span>
                  </div>
                  <Separator className="bg-red-200" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-2xl text-red-600">
                      {formatearMoneda(notaCredito.total)}
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
                    <div className="flex justify-between items-center text-red-600">
                      <span className="text-sm">(-) Nota de Crédito:</span>
                      <span className="font-semibold">
                        -{formatearMoneda(notaCredito.total)}
                      </span>
                    </div>
                    <Separator className="bg-green-200" />
                    <div className="flex justify-between items-center pt-3 border-t-2 border-green-400">
                      <span className="font-bold text-lg">Saldo:</span>
                      <span className="font-bold text-2xl text-green-600">
                        {formatearMoneda(venta.total - notaCredito.total)}
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
