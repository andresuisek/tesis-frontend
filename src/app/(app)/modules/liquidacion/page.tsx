"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { supabase, TaxLiquidation } from "@/lib/supabase";
import { toast } from "sonner";
import { LiquidacionesTable } from "@/components/liquidacion/liquidaciones-table";
import { GenerarLiquidacionDialog } from "@/components/liquidacion/generar-liquidacion-dialog";
import { mapTaxLiquidationToSummary } from "@/lib/liquidacion";
import { LiquidacionKPIs } from "@/components/liquidacion/liquidacion-kpis";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAvailableYears } from "@/hooks/use-available-years";
import dayjs from "dayjs";
import { DetalleLiquidacionDialog } from "@/components/liquidacion/detalle-liquidacion-dialog";
import posthog from "posthog-js";

export default function LiquidacionPage() {
  // Usar contribuyenteEfectivo para soportar tanto contribuyentes como contadores
  const { contribuyenteEfectivo: contribuyente } = useAuth();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears, refresh: refreshAvailableYears } = useAvailableYears(
    "tax_liquidations",
    "fecha_inicio_cierre"
  );
  const [liquidaciones, setLiquidaciones] = useState<TaxLiquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const [totalRows, setTotalRows] = useState(0);
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  const liquidacionSeleccionada = useMemo(
    () =>
      liquidaciones.find((item) => item.id === selectedId) ||
      liquidaciones[0] ||
      null,
    [liquidaciones, selectedId]
  );
  const resumenSeleccionado = useMemo(
    () =>
      liquidacionSeleccionada
        ? mapTaxLiquidationToSummary(liquidacionSeleccionada)
        : null,
    [liquidacionSeleccionada]
  );

  const cargarLiquidaciones = async () => {
    if (!contribuyente?.ruc) {
      setLiquidaciones([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startDate =
        selectedMonth !== null
          ? dayjs()
              .year(selectedYear)
              .month(selectedMonth - 1)
              .startOf("month")
              .format("YYYY-MM-DD")
          : dayjs().year(selectedYear).startOf("year").format("YYYY-MM-DD");
      const endDate =
        selectedMonth !== null
          ? dayjs()
              .year(selectedYear)
              .month(selectedMonth - 1)
              .endOf("month")
              .format("YYYY-MM-DD")
          : dayjs().year(selectedYear).endOf("year").format("YYYY-MM-DD");

      const { data, error, count } = await supabase
        .from("tax_liquidations")
        .select("*", { count: "exact" })
        .eq("contribuyente_ruc", contribuyente.ruc)
        .gte("fecha_inicio_cierre", startDate)
        .lte("fecha_inicio_cierre", endDate)
        .order("fecha_inicio_cierre", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (error) throw error;

      setLiquidaciones(data || []);
      setTotalRows(count ?? 0);
      setSelectedId((prev) => {
        if (!data || data.length === 0) return null;
        const existePrevio = prev ? data.some((item) => item.id === prev) : false;
        return existePrevio ? prev : data[0].id;
      });
    } catch (error) {
      console.error("Error cargando liquidaciones:", error);
      toast.error("No se pudo cargar el historial de liquidaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLiquidaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contribuyente?.ruc, page, pageSize, selectedMonth, selectedYear]);

  useEffect(() => {
    setPage(0);
  }, [selectedMonth, selectedYear]);

  const handleSeleccion = (liquidacion: TaxLiquidation) => {
    setSelectedId(liquidacion.id);
    setDetalleAbierto(true);
  };

  const handleCierreCreado = () => {
    // Track tax liquidation creation
    posthog.capture("liquidacion_created", {
      contribuyente_ruc: contribuyente?.ruc,
      selected_year: selectedYear,
      selected_month: selectedMonth,
    });
    cargarLiquidaciones();
    refreshAvailableYears();
  };

  if (!contribuyente) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        Registra la información de tu contribuyente para habilitar el módulo de
        liquidaciones.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Liquidación de Impuesto IVA
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus cierres mensuales o semestrales y controla los saldos a
            pagar o a favor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar historial
          </Button>
          <Button className="gap-2" onClick={() => setModalAbierto(true)}>
            <PlusCircle className="h-4 w-4" />
            Nuevo cierre
          </Button>
        </div>
      </div>

      <TaxPeriodFilter availableYears={availableYears} />

      <LiquidacionKPIs
        resumen={resumenSeleccionado}
        periodoLabel={resumenSeleccionado?.periodo.label}
      />

      <Card>
        <CardHeader>
          <CardTitle>Historial de cierres</CardTitle>
          <CardDescription>
            Cierres registrados por la plataforma a partir de tus datos
            contables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LiquidacionesTable
            liquidaciones={liquidaciones}
            loading={loading}
            onSelect={handleSeleccion}
            selectedId={liquidacionSeleccionada?.id ?? null}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Página {page + 1} de {Math.max(1, Math.ceil(totalRows / pageSize))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) =>
                    (p + 1) * pageSize >= totalRows ? p : p + 1
                  )
                }
                disabled={(page + 1) * pageSize >= totalRows}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <GenerarLiquidacionDialog
        open={modalAbierto}
        onOpenChange={setModalAbierto}
        contribuyenteRuc={contribuyente.ruc}
        onCreated={handleCierreCreado}
      />
      <DetalleLiquidacionDialog
        open={detalleAbierto}
        onOpenChange={setDetalleAbierto}
        liquidacion={liquidacionSeleccionada}
      />
    </div>
  );
}

