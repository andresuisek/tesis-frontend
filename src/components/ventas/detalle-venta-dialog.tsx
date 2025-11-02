"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Venta, NotaCredito, Retencion } from "@/lib/supabase";
import {
  Loader2,
  FileText,
  Receipt,
  Calculator,
  TrendingDown,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface DetalleVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venta: Venta;
}

export function DetalleVentaDialog({
  open,
  onOpenChange,
  venta,
}: DetalleVentaDialogProps) {
  const [notaCredito, setNotaCredito] = useState<NotaCredito | null>(null);
  const [retencion, setRetencion] = useState<Retencion | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRetencion, setLoadingRetencion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRetencion, setErrorRetencion] = useState<string | null>(null);

  useEffect(() => {
    const cargarNotaCredito = async () => {
      if (!venta.nota_credito_id || !open) {
        // Limpiar el estado si el diálogo se cierra o no hay nota de crédito
        setNotaCredito(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("notas_credito")
          .select("*")
          .eq("id", venta.nota_credito_id)
          .single();

        if (error) {
          console.error("Error de Supabase:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          setError(error.message || "No se pudo cargar la nota de crédito");
          setNotaCredito(null);
          return;
        }

        if (data) {
          setNotaCredito(data);
          setError(null);
        }
      } catch (error) {
        console.error("Error al cargar nota de crédito:", error);
        setError("Error inesperado al cargar la nota de crédito");
        setNotaCredito(null);
      } finally {
        setLoading(false);
      }
    };

    cargarNotaCredito();
  }, [venta.nota_credito_id, open]);

  // useEffect para cargar la retención
  useEffect(() => {
    const cargarRetencion = async () => {
      if (!venta.retencion_id || !open) {
        setRetencion(null);
        setLoadingRetencion(false);
        return;
      }

      setLoadingRetencion(true);
      setErrorRetencion(null);
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("retenciones")
          .select("*")
          .eq("id", venta.retencion_id)
          .single();

        if (error) {
          console.error("Error de Supabase al cargar retención:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          setErrorRetencion(error.message || "No se pudo cargar la retención");
          setRetencion(null);
          return;
        }

        if (data) {
          setRetencion(data);
          setErrorRetencion(null);
        }
      } catch (error) {
        console.error("Error al cargar retención:", error);
        setErrorRetencion("Error inesperado al cargar la retención");
        setRetencion(null);
      } finally {
        setLoadingRetencion(false);
      }
    };

    cargarRetencion();
  }, [venta.retencion_id, open]);

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  const formatearFecha = (fecha: string): string => {
    return dayjs(fecha).format("DD [de] MMMM [de] YYYY");
  };

  const formatearTipoComprobante = (tipo: string): string => {
    const tipos: Record<string, string> = {
      factura: "Factura",
      nota_credito: "Nota de Crédito",
      liquidacion_compra: "Liquidación de Compra",
      retencion: "Retención",
      otros: "Otros",
    };
    return tipos[tipo] || tipo;
  };

  // Cálculos
  const totalOriginal = venta.total;
  const totalNotaCredito = notaCredito?.total || 0;
  const totalRetencion =
    (retencion?.retencion_valor || 0) + (retencion?.retencion_renta_valor || 0);
  const totalNeto = totalOriginal - totalNotaCredito - totalRetencion;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalle de Venta
          </DialogTitle>
          <DialogDescription>
            Información completa de la venta y sus documentos relacionados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la Venta */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-lg font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                Venta Original
              </h3>
              <Badge variant="default">
                {formatearTipoComprobante(venta.tipo_comprobante)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Comprobante</p>
                <p className="font-mono font-medium">
                  {venta.numero_comprobante}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Fecha de Emisión
                </p>
                <p className="font-medium">
                  {formatearFecha(venta.fecha_emision)}
                </p>
              </div>
              {venta.ruc_cliente && (
                <div>
                  <p className="text-sm text-muted-foreground">RUC Cliente</p>
                  <p className="font-mono">{venta.ruc_cliente}</p>
                </div>
              )}
              {venta.razon_social_cliente && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{venta.razon_social_cliente}</p>
                </div>
              )}
            </div>

            {/* Desglose de valores */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal 0%:</span>
                <span>{formatearMoneda(venta.subtotal_0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal 8%:</span>
                <span>{formatearMoneda(venta.subtotal_8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal 15%:</span>
                <span>{formatearMoneda(venta.subtotal_15)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">IVA:</span>
                <span className="text-info">
                  {formatearMoneda(venta.iva)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span>Total Original:</span>
                <span className="text-primary">
                  {formatearMoneda(totalOriginal)}
                </span>
              </div>
            </div>
          </div>

          {/* Nota de Crédito */}
          {venta.nota_credito_id && (
            <>
              {loading ? (
                <div className="border rounded-lg p-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
                  <div className="mb-2 flex items-center gap-2 text-destructive">
                    <FileText className="h-5 w-5" />
                    <h3 className="font-semibold">
                      Error al cargar Nota de Crédito
                    </h3>
                  </div>
                  <p className="text-sm text-destructive/90">{error}</p>
                  <p className="mt-2 text-xs text-destructive/80">
                    Verifica los permisos de la base de datos o contacta al
                    administrador.
                  </p>
                </div>
              ) : notaCredito ? (
                <div className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-3 text-lg font-semibold">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <FileText className="h-4 w-4" />
                      </span>
                      Nota de Crédito
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-destructive/30 text-destructive"
                    >
                      Descuento Aplicado
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Comprobante
                      </p>
                      <p className="font-mono font-medium">
                        {notaCredito.numero_comprobante}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Fecha de Emisión
                      </p>
                      <p className="font-medium">
                        {formatearFecha(notaCredito.fecha_emision)}
                      </p>
                    </div>
                  </div>

                  {/* Desglose de valores */}
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Subtotal 0%:
                      </span>
                      <span>{formatearMoneda(notaCredito.subtotal_0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Subtotal 8%:
                      </span>
                      <span>{formatearMoneda(notaCredito.subtotal_8)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Subtotal 15%:
                      </span>
                      <span>{formatearMoneda(notaCredito.subtotal_15)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-muted-foreground">IVA:</span>
                      <span className="text-info">
                        {formatearMoneda(notaCredito.iva)}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Total Nota de Crédito:</span>
                      <span className="text-destructive">
                        -{formatearMoneda(totalNotaCredito)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Retención */}
          {venta.retencion_id && (
            <>
              {loadingRetencion ? (
                <div className="border rounded-lg p-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : errorRetencion ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
                  <div className="mb-2 flex items-center gap-2 text-destructive">
                    <Receipt className="h-5 w-5" />
                    <h3 className="font-semibold">Error al cargar Retención</h3>
                  </div>
                  <p className="text-sm text-destructive/90">{errorRetencion}</p>
                  <p className="mt-2 text-xs text-destructive/80">
                    Verifica los permisos de la base de datos o contacta al
                    administrador.
                  </p>
                </div>
              ) : retencion ? (
                <div className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-3 text-lg font-semibold">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Receipt className="h-4 w-4" />
                      </span>
                      Retención
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary"
                    >
                      Aplicada
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {retencion.serie_comprobante && (
                      <div>
                        <p className="text-sm text-muted-foreground">Serie</p>
                        <p className="font-mono font-medium">
                          {retencion.serie_comprobante}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Fecha de Emisión
                      </p>
                      <p className="font-medium">
                        {formatearFecha(retencion.fecha_emision)}
                      </p>
                    </div>
                    {retencion.clave_acceso && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">
                          Clave de Acceso
                        </p>
                        <p className="font-mono text-xs">
                          {retencion.clave_acceso}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Desglose de retenciones */}
                  <div className="mt-4 pt-4 border-t space-y-2">
                    {retencion.retencion_iva_percent &&
                    retencion.retencion_valor ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Retención IVA ({retencion.retencion_iva_percent}%):
                        </span>
                        <span className="text-info">
                          {formatearMoneda(retencion.retencion_valor)}
                        </span>
                      </div>
                    ) : null}
                    {retencion.retencion_renta_percent &&
                    retencion.retencion_renta_valor ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Retención Renta ({retencion.retencion_renta_percent}
                          %):
                        </span>
                        <span className="text-primary">
                          {formatearMoneda(retencion.retencion_renta_valor)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Total Retención:</span>
                      <span className="text-primary">
                        -{formatearMoneda(totalRetencion)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Cálculo Final */}
          {(notaCredito || retencion) && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calculator className="h-4 w-4" />
                </span>
                <h3 className="text-lg font-semibold">Resumen Final</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Original</span>
                  <span className="font-mono font-semibold text-primary">
                    {formatearMoneda(totalOriginal)}
                  </span>
                </div>
                {notaCredito && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      Nota de Crédito
                    </span>
                    <span className="font-mono text-destructive">
                      -{formatearMoneda(totalNotaCredito)}
                    </span>
                  </div>
                )}
                {retencion && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <TrendingDown className="h-4 w-4 text-primary" />
                      Retención
                    </span>
                    <span className="font-mono text-primary">
                      -{formatearMoneda(totalRetencion)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-base font-semibold text-foreground">
                    Saldo
                  </span>
                  <span className="font-mono text-2xl font-semibold text-success">
                    {formatearMoneda(totalNeto)}
                  </span>
                </div>

                <div className="rounded-lg bg-card p-3 text-center text-xs text-muted-foreground">
                  Reducción total aplicada:{" "}
                  <span className="font-semibold text-foreground">
                    {(
                      ((totalNotaCredito + totalRetencion) / totalOriginal) *
                      100
                    ).toFixed(2)}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sin Nota de Crédito ni Retención */}
          {!venta.nota_credito_id && !venta.retencion_id && (
            <div className="border rounded-lg p-6 text-center bg-muted/50">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Esta venta no tiene documentos asociados (nota de crédito o
                retención)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo: {formatearMoneda(totalOriginal)}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
