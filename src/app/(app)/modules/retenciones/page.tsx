"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RetencionesTable } from "@/components/retenciones/retenciones-table";
import { RetencionesTableFilters } from "@/components/retenciones/retenciones-table-filters";
import { RetencionesPagination } from "@/components/retenciones/retenciones-pagination";
import { DetalleRetencionDialog } from "@/components/retenciones/detalle-retencion-dialog";
import { ImportarRetencionesDialog } from "@/components/retenciones/importar-retenciones-dialog";
import { Retencion } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Receipt, DollarSign, Calculator, Calendar, Upload } from "lucide-react";
import { SkeletonStatCardSimple, SkeletonTableRows } from "@/components/skeletons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAvailableYears } from "@/hooks/use-available-years";
import { useRetencionesTable } from "@/hooks/use-retenciones-table";

dayjs.locale("es");

export default function RetencionesPage() {
  const { user, contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears } = useAvailableYears("retenciones");

  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [showImportarDialog, setShowImportarDialog] = useState(false);
  const [retencionSeleccionada, setRetencionSeleccionada] =
    useState<Retencion | null>(null);

  const {
    retenciones: tableRetenciones,
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
  } = useRetencionesTable();

  // Reset table page when period changes
  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedMonth, setPage]);

  // Formatear moneda
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  // KPIs derivados del hook
  const totalRetenciones = totalCount;
  const totalMonto = tableTotals.total;
  const periodoLabel =
    selectedMonth !== null
      ? `${dayjs().month(selectedMonth - 1).format("MMMM")} ${selectedYear}`
      : `Ano ${selectedYear}`;
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

  const handleRetencionesImportadas = () => {
    invalidateTable();
  };

  if (!user || !contribuyente) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          Debes iniciar sesion para ver este contenido.
        </p>
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
      {tableLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCardSimple key={i} />
          ))}
        </div>
      ) : (
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
                Promedio por retencion
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
      )}

      {/* Tabla de Retenciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Receipt className="h-5 w-5 text-primary" />
                  Listado de Retenciones
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalCount} retencion{totalCount !== 1 ? "es" : ""} encontrada{totalCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <RetencionesTableFilters
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
            <RetencionesTable
              retenciones={tableRetenciones}
              onView={handleVerDetalle}
              isFetching={tableFetching}
              totals={tableTotals}
            />
          )}
        </CardContent>

        {/* Pagination inside card */}
        {!tableLoading && totalCount > 0 && (
          <div className="border-t px-6">
            <RetencionesPagination
              paginaActual={page}
              totalItems={totalCount}
              itemsPorPagina={itemsPerPage}
              onPaginaChange={setPage}
            />
          </div>
        )}
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
        onRetencionesImportadas={handleRetencionesImportadas}
      />
    </div>
  );
}
