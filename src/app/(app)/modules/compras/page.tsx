"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase, Compra } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ComprasKPIs } from "@/components/compras/compras-kpis";
import { ComprasTable } from "@/components/compras/compras-table";
import { GastosPersonalesSummary } from "@/components/compras/gastos-personales-summary";
import { ComprasPagination } from "@/components/compras/compras-pagination";
import { ComprasTableFilters } from "@/components/compras/compras-table-filters";
import { NuevaCompraDialog } from "@/components/compras/nueva-compra-dialog";
import { ImportarComprasDialog } from "@/components/compras/importar-compras-dialog";
import { Plus, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { exportComprasExcel } from "@/lib/reports/compras-excel";
import { exportGastosPersonalesPDF } from "@/lib/reports/gastos-personales-pdf";
import { SkeletonStatCard, SkeletonTableRows } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAvailableYears } from "@/hooks/use-available-years";
import { useComprasTable } from "@/hooks/use-compras-table";
import posthog from "posthog-js";

export default function ComprasPage() {
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears, refresh: refreshAvailableYears } =
    useAvailableYears("compras");

  // ── Flow A: Summary data for KPIs + GastosPersonales ──
  const [todasLasCompras, setTodasLasCompras] = useState<Compra[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [showNuevaCompraDialog, setShowNuevaCompraDialog] = useState(false);
  const [showImportarDialog, setShowImportarDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingGastosPDF, setExportingGastosPDF] = useState(false);

  // ── Flow B: Table with server-side filtering + pagination ──
  const {
    compras: tableCompras,
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
  } = useComprasTable();

  dayjs.locale("es");

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
      await exportComprasExcel({
        ruc: contribuyente.ruc,
        periodStart,
        periodEnd,
        rubro: filters.rubro,
        tipoComprobante: filters.tipoComprobante,
        busqueda: filters.busqueda || undefined,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
      }, periodoLabel);
      toast.success("Excel de compras descargado");
    } catch {
      toast.error("Error al exportar compras");
    } finally {
      setExporting(false);
    }
  };

  const handleExportGastosPDF = async () => {
    if (!contribuyente?.ruc) return;
    setExportingGastosPDF(true);
    try {
      const nombre = `${contribuyente.first_name ?? ""} ${contribuyente.last_name ?? ""}`.trim() || contribuyente.ruc;
      const label = selectedMonth !== null
        ? dayjs().year(selectedYear).month(selectedMonth - 1).format("MMMM YYYY")
        : `${selectedYear}`;
      await exportGastosPersonalesPDF(
        todasLasCompras,
        contribuyente.cargas_familiares,
        nombre,
        contribuyente.ruc,
        label
      );
      toast.success("PDF de gastos personales descargado");
    } catch {
      toast.error("Error al generar el PDF");
    } finally {
      setExportingGastosPDF(false);
    }
  };

  const cargarResumen = useCallback(async () => {
    if (!contribuyente) return;

    setSummaryLoading(true);
    try {
      let query = supabase
        .from("compras")
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
      setTodasLasCompras(data || []);
    } catch (error: unknown) {
      console.error("Error al cargar resumen de compras:", error);
      toast.error("Error al cargar las compras");
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

  const handleEliminarCompra = async (compra: Compra) => {
    if (!confirm("¿Estas seguro de eliminar esta compra?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("compras")
        .delete()
        .eq("id", compra.id);

      if (error) throw error;

      posthog.capture("compra_deleted", {
        contribuyente_ruc: contribuyente?.ruc,
        compra_id: compra.id,
      });

      toast.success("Compra eliminada exitosamente");
      cargarResumen();
      invalidateTable();
    } catch (error: unknown) {
      console.error("Error al eliminar compra:", error);
      toast.error("Error al eliminar la compra");
    }
  };

  const handleCompraCreada = () => {
    posthog.capture("compra_created", {
      contribuyente_ruc: contribuyente?.ruc,
      selected_year: selectedYear,
      selected_month: selectedMonth,
    });
    cargarResumen();
    invalidateTable();
    refreshAvailableYears();
  };

  const handleComprasImportadas = () => {
    posthog.capture("compras_imported", {
      contribuyente_ruc: contribuyente?.ruc,
      selected_year: selectedYear,
      selected_month: selectedMonth,
    });
    cargarResumen();
    invalidateTable();
    refreshAvailableYears();
  };

  if (!contribuyente) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">
          Cargando informacion del contribuyente...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gestion de Compras
            </h1>
            <p className="text-muted-foreground">
              Administra todas tus compras, gastos y proveedores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={exporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar Excel"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportarDialog(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            <Button
              onClick={() => setShowNuevaCompraDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva compra
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros de periodo */}
      <TaxPeriodFilter availableYears={availableYears} />

      {/* KPIs */}
      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <ComprasKPIs compras={todasLasCompras} />
      )}

      {/* Gastos Personales */}
      {summaryLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <GastosPersonalesSummary
            compras={todasLasCompras}
            cargasFamiliares={contribuyente.cargas_familiares}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportGastosPDF}
              disabled={exportingGastosPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exportingGastosPDF ? "Generando..." : "Descargar PDF Gastos Personales"}
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de compras */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Registro de compras
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalCount} compra{totalCount !== 1 ? "s" : ""} encontrada
                  {totalCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <ComprasTableFilters
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
            <ComprasTable
              compras={tableCompras}
              onEliminar={handleEliminarCompra}
              isFetching={tableFetching}
              totals={tableTotals}
            />
          )}
        </CardContent>

        {/* Pagination inside card */}
        {!tableLoading && totalCount > 0 && (
          <div className="border-t px-6">
            <ComprasPagination
              paginaActual={page}
              totalItems={totalCount}
              itemsPorPagina={itemsPerPage}
              onPaginaChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Dialog Nueva Compra */}
      <NuevaCompraDialog
        open={showNuevaCompraDialog}
        onOpenChange={setShowNuevaCompraDialog}
        contribuyenteRuc={contribuyente.ruc}
        onCompraCreada={handleCompraCreada}
      />

      {/* Dialog Importar Compras */}
      <ImportarComprasDialog
        open={showImportarDialog}
        onOpenChange={setShowImportarDialog}
        contribuyenteRuc={contribuyente.ruc}
        onComprasImportadas={handleComprasImportadas}
      />
    </div>
  );
}
