"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Upload, Download } from "lucide-react";
import { supabase, Venta } from "@/lib/supabase";
import { exportVentasExcel } from "@/lib/reports/ventas-excel";
import { SkeletonStatCard, SkeletonTableRows } from "@/components/skeletons";
import { useAuth } from "@/contexts/auth-context";
import { VentasKPIs } from "@/components/ventas/ventas-kpis";
import { VentasTable } from "@/components/ventas/ventas-table";
import { VentasTableFilters } from "@/components/ventas/ventas-table-filters";
import { VentasPagination } from "@/components/ventas/ventas-pagination";
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
import { useVentasTable } from "@/hooks/use-ventas-table";
import posthog from "posthog-js";

dayjs.locale("es");

export default function VentasPage() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears, refresh: refreshAvailableYears } =
    useAvailableYears("ventas");

  // ── Flow A: Summary data for KPIs ──
  const [todasLasVentas, setTodasLasVentas] = useState<Venta[]>([]);
  const [ventasMesAnterior, setVentasMesAnterior] = useState<Venta[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [exporting, setExporting] = useState(false);
  const [showNewVentaDialog, setShowNewVentaDialog] = useState(false);
  const [showNotaCreditoDialog, setShowNotaCreditoDialog] = useState(false);
  const [showRetencionDialog, setShowRetencionDialog] = useState(false);
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [showImportarDialog, setShowImportarDialog] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);

  // ── Flow B: Table with server-side filtering + pagination ──
  const {
    ventas: tableVentas,
    totalCount,
    totals: tableTotals,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    activeFilterCount,
    isLoading: tableLoading,
    isFetching: tableFetching,
    invalidate: invalidateTable,
    itemsPerPage,
  } = useVentasTable();

  // Period bounds for exports
  const periodStart = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).startOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).startOf("year").format("YYYY-MM-DD");
  const periodEnd = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).endOf("month").format("YYYY-MM-DD")
    : dayjs().year(selectedYear).endOf("year").format("YYYY-MM-DD");
  const periodoLabel = selectedMonth !== null
    ? dayjs().year(selectedYear).month(selectedMonth - 1).format("MMMM_YYYY")
    : `${selectedYear}`;

  const handleExportExcel = async () => {
    if (!contribuyente?.ruc) return;
    setExporting(true);
    try {
      await exportVentasExcel({
        ruc: contribuyente.ruc,
        periodStart,
        periodEnd,
        tipoComprobante: filters.tipoComprobante,
        busqueda: filters.busqueda || undefined,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
      }, periodoLabel);
      toast.success("Excel de ventas descargado");
    } catch {
      toast.error("Error al exportar ventas");
    } finally {
      setExporting(false);
    }
  };

  const cargarResumen = useCallback(async () => {
    if (!contribuyente?.ruc) {
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    try {
      let query = supabase
        .from("ventas")
        .select("*")
        .eq("contribuyente_ruc", contribuyente.ruc);

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

      const { data, error } = await query.order("fecha_emision", {
        ascending: false,
      });

      if (error) throw error;
      setTodasLasVentas(data || []);

      // Cargar ventas del mes anterior para comparacion de tendencias
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
      console.error("Error al cargar resumen de ventas:", error);
      toast.error("Error al cargar las ventas");
    } finally {
      setSummaryLoading(false);
    }
  }, [contribuyente, selectedYear, selectedMonth]);

  useEffect(() => {
    if (contribuyente) {
      cargarResumen();
    }
  }, [contribuyente, cargarResumen]);

  // Reset table page when period changes
  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedMonth, setPage]);

  const handleVentaCreada = () => {
    posthog.capture("venta_created", {
      contribuyente_ruc: contribuyente?.ruc,
      selected_year: selectedYear,
      selected_month: selectedMonth,
    });
    cargarResumen();
    invalidateTable();
    refreshAvailableYears();
  };

  const handleVentasImportadas = () => {
    posthog.capture("ventas_imported", {
      contribuyente_ruc: contribuyente?.ruc,
      selected_year: selectedYear,
      selected_month: selectedMonth,
    });
    cargarResumen();
    invalidateTable();
    refreshAvailableYears();
  };

  const handleCrearNotaCredito = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setShowNotaCreditoDialog(true);
  };

  const handleNotaCreditoCreada = () => {
    cargarResumen();
    invalidateTable();
  };

  const handleCrearRetencion = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setShowRetencionDialog(true);
  };

  const handleRetencionCreada = () => {
    cargarResumen();
    invalidateTable();
  };

  const handleVerDetalle = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setShowDetalleDialog(true);
  };

  const handleCloseNotaCreditoDialog = (open: boolean) => {
    setShowNotaCreditoDialog(open);
    if (!open) {
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
            Gestion de Ventas
          </h1>
          <p className="text-muted-foreground">
            Administra todas tus facturas, notas de credito y debito
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button variant="outline" onClick={() => setShowImportarDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar XML
          </Button>
          <Button onClick={() => setShowNewVentaDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Filtros de periodo */}
      <TaxPeriodFilter availableYears={availableYears} />

      {/* KPIs de ventas */}
      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <VentasKPIs ventas={todasLasVentas} mesAnterior={ventasMesAnterior} />
      )}

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Registro de ventas
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalCount} venta{totalCount !== 1 ? "s" : ""} encontrada
                  {totalCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <VentasTableFilters
              filters={filters}
              onFilterChange={updateFilter}
              onReset={resetFilters}
              activeFilterCount={activeFilterCount}
              isFetching={tableFetching}
            />
          </div>
        </CardHeader>
        <CardContent>
          {tableLoading ? (
            <SkeletonTableRows rows={8} columns={7} />
          ) : (
            <VentasTable
              ventas={tableVentas}
              onCrearNotaCredito={handleCrearNotaCredito}
              onCrearRetencion={handleCrearRetencion}
              onView={handleVerDetalle}
              isFetching={tableFetching}
              totals={tableTotals}
            />
          )}
        </CardContent>

        {/* Pagination inside card */}
        {!tableLoading && totalCount > 0 && (
          <div className="border-t px-6">
            <VentasPagination
              paginaActual={page}
              totalItems={totalCount}
              itemsPorPagina={itemsPerPage}
              onPaginaChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Dialog para nueva venta */}
      <NuevaVentaDialog
        open={showNewVentaDialog}
        onOpenChange={setShowNewVentaDialog}
        onVentaCreada={handleVentaCreada}
        contribuyenteRuc={contribuyente.ruc}
      />

      <ImportarVentasDialog
        open={showImportarDialog}
        onOpenChange={setShowImportarDialog}
        onVentasImportadas={handleVentasImportadas}
        contribuyenteRuc={contribuyente.ruc}
      />

      {/* Dialogs */}
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
