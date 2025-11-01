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
import { Plus } from "lucide-react";
import { supabase, Venta } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { VentasKPIs } from "@/components/ventas/ventas-kpis";
import { VentasTable } from "@/components/ventas/ventas-table";
import { VentasFilters } from "@/components/ventas/ventas-filters";
import { NuevaVentaDialog } from "@/components/ventas/nueva-venta-dialog";
import { NuevaNotaCreditoDialog } from "@/components/ventas/nueva-nota-credito-dialog";
import { NuevaRetencionDialog } from "@/components/ventas/nueva-retencion-dialog";
import { DetalleVentaDialog } from "@/components/ventas/detalle-venta-dialog";
import { toast } from "sonner";
import dayjs from "dayjs";
import "dayjs/locale/es";

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
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(
    null
  );

  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

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
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      toast.error("Error al cargar las ventas");
    } finally {
      setLoading(false);
    }
  };

  // Cargar años disponibles
  const cargarAnosDisponibles = async () => {
    if (!contribuyente?.ruc) return;

    try {
      const { data, error } = await supabase
        .from("ventas")
        .select("fecha_emision")
        .eq("contribuyente_ruc", contribuyente.ruc)
        .order("fecha_emision", { ascending: false });

      if (error) throw error;

      const years = new Set<number>();
      data?.forEach((venta) => {
        const year = dayjs(venta.fecha_emision).year();
        years.add(year);
      });

      // Asegurar que el año actual siempre esté disponible
      years.add(dayjs().year());

      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    } catch (error) {
      console.error("Error al cargar años disponibles:", error);
    }
  };

  // Cargar datos cuando cambia el contribuyente o los filtros
  useEffect(() => {
    cargarVentas();
  }, [contribuyente, selectedYear, selectedMonth]);

  // Cargar años disponibles al montar el componente
  useEffect(() => {
    cargarAnosDisponibles();
  }, [contribuyente]);

  const handleVentaCreada = () => {
    cargarVentas();
    cargarAnosDisponibles();
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
        <Button onClick={() => setShowNewVentaDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      {/* Filtros */}
      <VentasFilters
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        availableYears={availableYears}
      />

      {/* KPIs de ventas */}
      <VentasKPIs ventas={ventas} mesAnterior={ventasMesAnterior} />

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Ventas</CardTitle>
          <CardDescription>
            Listado completo de todas las ventas registradas
            {selectedMonth &&
              ` - ${dayjs()
                .month(selectedMonth - 1)
                .format("MMMM")} ${selectedYear}`}
            {!selectedMonth && ` - Año ${selectedYear}`}
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
