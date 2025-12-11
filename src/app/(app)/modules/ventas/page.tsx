"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";
import { supabase, Venta } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { VentasKPIs } from "@/components/ventas/ventas-kpis";
import { VentasTable } from "@/components/ventas/ventas-table";
import { NuevaVentaDialog } from "@/components/ventas/nueva-venta-dialog";
import { NuevaNotaCreditoDialog } from "@/components/ventas/nueva-nota-credito-dialog";
import { NuevaRetencionDialog } from "@/components/ventas/nueva-retencion-dialog";
import { DetalleVentaDialog } from "@/components/ventas/detalle-venta-dialog";
import { ImportarVentasDialog } from "@/components/ventas/importar-ventas-dialog";
import { toast } from "sonner";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAvailableYears } from "@/hooks/use-available-years";

dayjs.locale("es");

export default function VentasPage() {
  const { contribuyente } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasMesAnterior, setVentasMesAnterior] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewVentaDialog, setShowNewVentaDialog] = useState(false);
  const [showNotaCreditoDialog, setShowNotaCreditoDialog] = useState(false);
  const [showRetencionDialog, setShowRetencionDialog] = useState(false);
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [showImportarDialog, setShowImportarDialog] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(
    null
  );

  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears, refresh: refreshAvailableYears } =
    useAvailableYears("ventas");

  // Cargar ventas desde Supabase
  const cargarVentas = async () => {
    if (!contribuyente?.ruc) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Construir query base
      let query = supabase
        .from("ventas")
        .select("*")
        .eq("contribuyente_ruc", contribuyente.ruc)
        .order("fecha_emision", { ascending: false });

      // Aplicar filtros de fecha si hay selección
      if (selectedMonth !== null) {
        // Filtrar por mes y año específicos
        const startDate = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .startOf("month")
          .format("YYYY-MM-DD");
        const endDate = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .endOf("month")
          .format("YYYY-MM-DD");

        query = query
          .gte("fecha_emision", startDate)
          .lte("fecha_emision", endDate);
      } else {
        // Filtrar solo por año
        const startDate = dayjs()
          .year(selectedYear)
          .startOf("year")
          .format("YYYY-MM-DD");
        const endDate = dayjs()
          .year(selectedYear)
          .endOf("year")
          .format("YYYY-MM-DD");

        query = query
          .gte("fecha_emision", startDate)
          .lte("fecha_emision", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVentas(data || []);

      // Cargar ventas del mes anterior para comparación de tendencias
      if (selectedMonth !== null) {
        const mesAnterior = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .subtract(1, "month");

        const { data: dataMesAnterior } = await supabase
          .from("ventas")
          .select("*")
          .eq("contribuyente_ruc", contribuyente.ruc)
          .gte(
            "fecha_emision",
            mesAnterior.startOf("month").format("YYYY-MM-DD")
          )
          .lte(
            "fecha_emision",
            mesAnterior.endOf("month").format("YYYY-MM-DD")
          );

        setVentasMesAnterior(dataMesAnterior || []);
      }
    } catch (error: unknown) {
      console.error("Error al cargar ventas:", error);
      toast.error("Error al cargar las ventas");
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando cambia el contribuyente o los filtros
  useEffect(() => {
    cargarVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contribuyente, selectedYear, selectedMonth]);

  const handleVentaCreada = () => {
    cargarVentas();
    refreshAvailableYears();
  };

  const handleVentasImportadas = () => {
    cargarVentas();
    refreshAvailableYears();
  };

  const handleCrearNotaCredito = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setShowNotaCreditoDialog(true);
  };

  const handleNotaCreditoCreada = () => {
    cargarVentas();
  };

  const handleCrearRetencion = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setShowRetencionDialog(true);
  };

  const handleRetencionCreada = () => {
    cargarVentas();
  };

  const handleVerDetalle = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setShowDetalleDialog(true);
  };

  const handleCloseNotaCreditoDialog = (open: boolean) => {
    setShowNotaCreditoDialog(open);
    if (!open) {
      // Limpiar la selección después de cerrar el diálogo
      setTimeout(() => {
        if (!showDetalleDialog && !showRetencionDialog) {
          setVentaSeleccionada(null);
        }
      }, 200);
    }
  };

  const handleCloseRetencionDialog = (open: boolean) => {
    setShowRetencionDialog(open);
    if (!open) {
      setTimeout(() => {
        if (!showDetalleDialog && !showNotaCreditoDialog) {
          setVentaSeleccionada(null);
        }
      }, 200);
    }
  };

  const handleCloseDetalleDialog = (open: boolean) => {
    setShowDetalleDialog(open);
    if (!open) {
      // Limpiar la selección después de cerrar el diálogo
      setTimeout(() => {
        if (!showNotaCreditoDialog && !showRetencionDialog) {
          setVentaSeleccionada(null);
        }
      }, 200);
    }
  };

  if (!contribuyente) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Debes tener un perfil de contribuyente registrado para gestionar
          ventas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Ventas
          </h1>
          <p className="text-muted-foreground">
            Administra todas tus facturas, notas de crédito y débito
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportarDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar TXT
          </Button>
          <Button onClick={() => setShowNewVentaDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <TaxPeriodFilter availableYears={availableYears} />

      {/* KPIs de ventas */}
      <VentasKPIs ventas={ventas} mesAnterior={ventasMesAnterior} />

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Ventas</CardTitle>
          <CardDescription>
            Listado completo de todas las ventas registradas
            {selectedMonth !== null &&
              ` - ${dayjs()
                .month(selectedMonth - 1)
                .format("MMMM")} ${selectedYear}`}
            {selectedMonth === null && ` - Año ${selectedYear}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VentasTable
            ventas={ventas}
            loading={loading}
            onCrearNotaCredito={handleCrearNotaCredito}
            onCrearRetencion={handleCrearRetencion}
            onView={handleVerDetalle}
          />
        </CardContent>
      </Card>

      {/* Dialog para nueva venta */}
      <NuevaVentaDialog
        open={showNewVentaDialog}
        onOpenChange={setShowNewVentaDialog}
        onVentaCreada={handleVentaCreada}
        contribuyenteRuc={contribuyente.ruc}
      />

      {/* Dialog para importar ventas */}
      <ImportarVentasDialog
        open={showImportarDialog}
        onOpenChange={setShowImportarDialog}
        onVentasImportadas={handleVentasImportadas}
        contribuyenteRuc={contribuyente.ruc}
      />

      {/* Dialogs - Mantener montados para preservar el estado */}
      {ventaSeleccionada && showNotaCreditoDialog && (
        <NuevaNotaCreditoDialog
          open={showNotaCreditoDialog}
          onOpenChange={handleCloseNotaCreditoDialog}
          onNotaCreditoCreada={handleNotaCreditoCreada}
          venta={ventaSeleccionada}
          contribuyenteRuc={contribuyente.ruc}
        />
      )}

      {ventaSeleccionada && showRetencionDialog && (
        <NuevaRetencionDialog
          open={showRetencionDialog}
          onOpenChange={handleCloseRetencionDialog}
          onRetencionCreada={handleRetencionCreada}
          venta={ventaSeleccionada}
          contribuyenteRuc={contribuyente.ruc}
        />
      )}

      {ventaSeleccionada && showDetalleDialog && (
        <DetalleVentaDialog
          open={showDetalleDialog}
          onOpenChange={handleCloseDetalleDialog}
          venta={ventaSeleccionada}
        />
      )}
    </div>
  );
}
