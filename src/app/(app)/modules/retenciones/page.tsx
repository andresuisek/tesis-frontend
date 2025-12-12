"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RetencionesTable } from "@/components/retenciones/retenciones-table";
import { DetalleRetencionDialog } from "@/components/retenciones/detalle-retencion-dialog";
import { ImportarRetencionesDialog } from "@/components/retenciones/importar-retenciones-dialog";
import { Retencion } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Receipt, DollarSign, Calculator, Calendar, Upload } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAvailableYears } from "@/hooks/use-available-years";

dayjs.locale("es");

export default function RetencionesPage() {
  const { user, contribuyente } = useAuth();
  const [retenciones, setRetenciones] = useState<Retencion[]>([]);
  const [loading, setLoading] = useState(true);
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears } = useAvailableYears("retenciones");

  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [showImportarDialog, setShowImportarDialog] = useState(false);
  const [retencionSeleccionada, setRetencionSeleccionada] =
    useState<Retencion | null>(null);

  // Función para recargar retenciones
  const recargarRetenciones = useCallback(async () => {
    if (!contribuyente?.ruc) return;

    setLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase");

      let query = supabase
        .from("retenciones")
        .select("*")
        .eq("contribuyente_ruc", contribuyente.ruc)
        .order("fecha_emision", { ascending: false });

      if (selectedMonth !== null) {
        const start = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .startOf("month")
          .format("YYYY-MM-DD");
        const end = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .endOf("month")
          .format("YYYY-MM-DD");
        query = query.gte("fecha_emision", start).lte("fecha_emision", end);
      } else {
        const start = dayjs()
          .year(selectedYear)
          .startOf("year")
          .format("YYYY-MM-DD");
        const end = dayjs()
          .year(selectedYear)
          .endOf("year")
          .format("YYYY-MM-DD");
        query = query.gte("fecha_emision", start).lte("fecha_emision", end);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRetenciones(data || []);
    } catch (error) {
      console.error("Error al recargar retenciones:", error);
      toast.error("Error al recargar las retenciones");
    } finally {
      setLoading(false);
    }
  }, [contribuyente?.ruc, selectedMonth, selectedYear]);

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

        let query = supabase
          .from("retenciones")
          .select("*")
          .eq("contribuyente_ruc", contribuyente.ruc)
          .order("fecha_emision", { ascending: false });

        if (selectedMonth !== null) {
          const start = dayjs()
            .year(selectedYear)
            .month(selectedMonth - 1)
            .startOf("month")
            .format("YYYY-MM-DD");
          const end = dayjs()
            .year(selectedYear)
            .month(selectedMonth - 1)
            .endOf("month")
            .format("YYYY-MM-DD");
          query = query.gte("fecha_emision", start).lte("fecha_emision", end);
        } else {
          const start = dayjs()
            .year(selectedYear)
            .startOf("year")
            .format("YYYY-MM-DD");
          const end = dayjs()
            .year(selectedYear)
            .endOf("year")
            .format("YYYY-MM-DD");
          query = query.gte("fecha_emision", start).lte("fecha_emision", end);
        }

        const { data, error } = await query;

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
  }, [contribuyente?.ruc, selectedMonth, selectedYear]);

  // Calcular estadísticas
  const totalRetenciones = retenciones.length;
  const totalMonto = retenciones.reduce(
    (sum, ret) =>
      sum + (ret.retencion_valor || 0) + (ret.retencion_renta_valor || 0),
    0
  );

  const periodoLabel =
    selectedMonth !== null
      ? `${dayjs().month(selectedMonth - 1).format("MMMM")} ${selectedYear}`
      : `Año ${selectedYear}`;
  const promedioPeriodo =
    totalRetenciones > 0 ? totalMonto / totalRetenciones : 0;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </span>
            Retenciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona y visualiza las retenciones emitidas
          </p>
        </div>
        <Button onClick={() => setShowImportarDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar XML
        </Button>
      </div>

      <TaxPeriodFilter availableYears={availableYears} />

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
            <div className="text-2xl font-semibold text-primary">
              {formatearMoneda(totalMonto)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total en retenciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Periodo seleccionado
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold capitalize">
              {periodoLabel}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedMonth !== null ? "Detalle mensual" : "Resumen anual"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Promedio por retención
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-primary">
              {formatearMoneda(promedioPeriodo)}
            </div>
            <p className="text-xs text-muted-foreground">
              Calculado para el periodo seleccionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Retenciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
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

      {/* Dialog de Importar */}
      <ImportarRetencionesDialog
        open={showImportarDialog}
        onOpenChange={setShowImportarDialog}
        contribuyenteRuc={contribuyente.ruc}
        onRetencionesImportadas={recargarRetenciones}
      />
    </div>
  );
}
