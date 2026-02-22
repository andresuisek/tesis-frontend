"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotasCreditoTable } from "@/components/notas-credito/notas-credito-table";
import { NotasCreditoTableFilters } from "@/components/notas-credito/notas-credito-table-filters";
import { NotasCreditoPagination } from "@/components/notas-credito/notas-credito-pagination";
import { DetalleNotaCreditoDialog } from "@/components/notas-credito/detalle-nota-credito-dialog";
import { NotaCredito } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { FileX, DollarSign, TrendingDown, Calendar } from "lucide-react";
import { SkeletonStatCardSimple, SkeletonTableRows } from "@/components/skeletons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAvailableYears } from "@/hooks/use-available-years";
import { useNotasCreditoTable } from "@/hooks/use-notas-credito-table";

dayjs.locale("es");

export default function NotasCreditoPage() {
  const { user, contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears } = useAvailableYears("notas_credito");

  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [notaCreditoSeleccionada, setNotaCreditoSeleccionada] =
    useState<NotaCredito | null>(null);

  const {
    notasCredito: tableNotasCredito,
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
    itemsPerPage,
  } = useNotasCreditoTable();

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
  const totalNotasCredito = totalCount;
  const totalMonto = tableTotals.total;
  const periodoLabel =
    selectedMonth !== null
      ? `${dayjs().month(selectedMonth - 1).format("MMMM")} ${selectedYear}`
      : `Ano ${selectedYear}`;
  const promedioPeriodo =
    totalNotasCredito > 0 ? totalMonto / totalNotasCredito : 0;

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
          Debes iniciar sesion para ver este contenido.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileX className="h-5 w-5" />
          </span>
          Notas de Credito
        </h1>
        <p className="text-muted-foreground">
          Gestiona y visualiza las notas de credito emitidas
        </p>
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
                Total Notas de Credito
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
              <div className="text-2xl font-semibold text-primary">
                {formatearMoneda(totalMonto)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total en notas de credito
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
                Promedio por nota
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
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

      {/* Tabla de Notas de Credito */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <FileX className="h-5 w-5 text-primary" />
                  Listado de Notas de Credito
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalCount} nota{totalCount !== 1 ? "s" : ""} de credito encontrada{totalCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <NotasCreditoTableFilters
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
            <NotasCreditoTable
              notasCredito={tableNotasCredito}
              onView={handleVerDetalle}
              isFetching={tableFetching}
              totals={tableTotals}
            />
          )}
        </CardContent>

        {/* Pagination inside card */}
        {!tableLoading && totalCount > 0 && (
          <div className="border-t px-6">
            <NotasCreditoPagination
              paginaActual={page}
              totalItems={totalCount}
              itemsPorPagina={itemsPerPage}
              onPaginaChange={setPage}
            />
          </div>
        )}
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
