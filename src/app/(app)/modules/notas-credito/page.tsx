"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotasCreditoTable } from "@/components/notas-credito/notas-credito-table";
import { DetalleNotaCreditoDialog } from "@/components/notas-credito/detalle-nota-credito-dialog";
import { NotaCredito } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { FileX, DollarSign, TrendingDown, Calendar } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

export default function NotasCreditoPage() {
  const { user, contribuyente } = useAuth();
  const [notasCredito, setNotasCredito] = useState<NotaCredito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [notaCreditoSeleccionada, setNotaCreditoSeleccionada] =
    useState<NotaCredito | null>(null);

  // Formatear moneda
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  // Cargar notas de crédito del usuario logueado
  useEffect(() => {
    const cargarNotasCredito = async () => {
      if (!contribuyente?.ruc) {
        setLoading(false);
        return;
      }

      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("notas_credito")
          .select("*")
          .eq("contribuyente_ruc", contribuyente.ruc)
          .order("fecha_emision", { ascending: false });

        if (error) throw error;

        setNotasCredito(data || []);
      } catch (error) {
        console.error("Error al cargar notas de crédito:", error);
        toast.error("Error al cargar las notas de crédito");
      } finally {
        setLoading(false);
      }
    };

    cargarNotasCredito();
  }, [contribuyente?.ruc]);

  // Calcular estadísticas
  const totalNotasCredito = notasCredito.length;
  const totalMonto = notasCredito.reduce((sum, nc) => sum + nc.total, 0);
  const notasCreditoMesActual = notasCredito.filter((nc) =>
    dayjs(nc.fecha_emision).isSame(dayjs(), "month")
  ).length;
  const montoMesActual = notasCredito
    .filter((nc) => dayjs(nc.fecha_emision).isSame(dayjs(), "month"))
    .reduce((sum, nc) => sum + nc.total, 0);

  // Handlers
  const handleVerDetalle = (notaCredito: NotaCredito) => {
    setNotaCreditoSeleccionada(notaCredito);
    setShowDetalleDialog(true);
  };

  const handleCloseDetalleDialog = (open: boolean) => {
    setShowDetalleDialog(open);
    if (!open) {
      setTimeout(() => {
        setNotaCreditoSeleccionada(null);
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
        <p className="text-muted-foreground">Cargando notas de crédito...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileX className="h-8 w-8 text-red-500" />
          Notas de Crédito
        </h1>
        <p className="text-muted-foreground">
          Gestiona y visualiza las notas de crédito emitidas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Notas de Crédito
            </CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotasCredito}</div>
            <p className="text-xs text-muted-foreground">
              Notas emitidas en total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatearMoneda(totalMonto)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total en notas de crédito
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notasCreditoMesActual}</div>
            <p className="text-xs text-muted-foreground">
              Notas emitidas en {dayjs().format("MMMM")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monto Este Mes
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatearMoneda(montoMesActual)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total en {dayjs().format("MMMM")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Notas de Crédito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-red-500" />
            Listado de Notas de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotasCreditoTable
            notasCredito={notasCredito}
            onView={handleVerDetalle}
          />
        </CardContent>
      </Card>

      {/* Dialog de Detalle */}
      {notaCreditoSeleccionada && showDetalleDialog && (
        <DetalleNotaCreditoDialog
          open={showDetalleDialog}
          onOpenChange={handleCloseDetalleDialog}
          notaCredito={notaCreditoSeleccionada}
        />
      )}
    </div>
  );
}
