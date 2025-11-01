"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RetencionesTable } from "@/components/retenciones/retenciones-table";
import { DetalleRetencionDialog } from "@/components/retenciones/detalle-retencion-dialog";
import { Retencion } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Receipt, DollarSign, Calculator, Calendar } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

export default function RetencionesPage() {
  const { user, contribuyente } = useAuth();
  const [retenciones, setRetenciones] = useState<Retencion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [retencionSeleccionada, setRetencionSeleccionada] =
    useState<Retencion | null>(null);

  // Formatear moneda
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  // Cargar retenciones del usuario logueado
  useEffect(() => {
    const cargarRetenciones = async () => {
      if (!contribuyente?.ruc) {
        setLoading(false);
        return;
      }

      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("retenciones")
          .select("*")
          .eq("contribuyente_ruc", contribuyente.ruc)
          .order("fecha_emision", { ascending: false });

        if (error) throw error;

        setRetenciones(data || []);
      } catch (error) {
        console.error("Error al cargar retenciones:", error);
        toast.error("Error al cargar las retenciones");
      } finally {
        setLoading(false);
      }
    };

    cargarRetenciones();
  }, [contribuyente?.ruc]);

  // Calcular estadísticas
  const totalRetenciones = retenciones.length;
  const totalMonto = retenciones.reduce(
    (sum, ret) =>
      sum + (ret.retencion_valor || 0) + (ret.retencion_renta_valor || 0),
    0
  );
  const retencionesMesActual = retenciones.filter((ret) =>
    dayjs(ret.fecha_emision).isSame(dayjs(), "month")
  ).length;
  const montoMesActual = retenciones
    .filter((ret) => dayjs(ret.fecha_emision).isSame(dayjs(), "month"))
    .reduce(
      (sum, ret) =>
        sum + (ret.retencion_valor || 0) + (ret.retencion_renta_valor || 0),
      0
    );

  // Handlers
  const handleVerDetalle = (retencion: Retencion) => {
    setRetencionSeleccionada(retencion);
    setShowDetalleDialog(true);
  };

  const handleCloseDetalleDialog = (open: boolean) => {
    setShowDetalleDialog(open);
    if (!open) {
      setTimeout(() => {
        setRetencionSeleccionada(null);
      }, 200);
    }
  };

  if (!user || !contribuyente) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          Debes iniciar sesión para ver este contenido.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Cargando retenciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-8 w-8 text-purple-500" />
          Retenciones
        </h1>
        <p className="text-muted-foreground">
          Gestiona y visualiza las retenciones emitidas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Retenciones
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRetenciones}</div>
            <p className="text-xs text-muted-foreground">
              Retenciones emitidas en total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatearMoneda(totalMonto)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total en retenciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retencionesMesActual}</div>
            <p className="text-xs text-muted-foreground">
              Retenciones emitidas en {dayjs().format("MMMM")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monto Este Mes
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatearMoneda(montoMesActual)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total en {dayjs().format("MMMM")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Retenciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-500" />
            Listado de Retenciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RetencionesTable
            retenciones={retenciones}
            onView={handleVerDetalle}
          />
        </CardContent>
      </Card>

      {/* Dialog de Detalle */}
      {retencionSeleccionada && showDetalleDialog && (
        <DetalleRetencionDialog
          open={showDetalleDialog}
          onOpenChange={handleCloseDetalleDialog}
          retencion={retencionSeleccionada}
        />
      )}
    </div>
  );
}
