"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LiquidacionSummary } from "./liquidacion-summary";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  LiquidacionSummaryData,
  MONTH_OPTIONS,
  PeriodSelection,
  PeriodType,
  SemesterValue,
  buildInsertPayloadFromSummary,
  buildPeriodInfo,
  calcularIVA,
  calculateLiquidacionResumen,
  formatCurrency,
  getPreviousSelection,
  periodHasFinished,
} from "@/lib/liquidacion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, Pencil, Sliders } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

dayjs.locale("es");

interface GenerarLiquidacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuyenteRuc: string;
  onCreated: () => void;
}

interface ManualValores {
  ventasBase0: string;
  ventasBase5: string;
  ventasBase8: string;
  ventasBase15: string;
  comprasBase0: string;
  comprasBase5: string;
  comprasBase8: string;
  comprasBase15: string;
  ctAdquisicionAnterior: string;
  ctRetencionAnterior: string;
  retencionesIvaPeriodo: string;
  retencionesRenta: string;
  rentaAPagar: string;
  ivaDiferidoMonto: string;
  mesesDiferimiento: string;
}

const defaultManualValores: ManualValores = {
  ventasBase0: "0",
  ventasBase5: "0",
  ventasBase8: "0",
  ventasBase15: "0",
  comprasBase0: "0",
  comprasBase5: "0",
  comprasBase8: "0",
  comprasBase15: "0",
  ctAdquisicionAnterior: "0",
  ctRetencionAnterior: "0",
  retencionesIvaPeriodo: "0",
  retencionesRenta: "0",
  rentaAPagar: "0",
  ivaDiferidoMonto: "0",
  mesesDiferimiento: "0",
};

const toNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function GenerarLiquidacionDialog({
  open,
  onOpenChange,
  contribuyenteRuc,
  onCreated,
}: GenerarLiquidacionDialogProps) {
  const today = dayjs();
  const currentYear = today.year();
  const previousMonth = dayjs().subtract(1, "month");

  const [tipoPeriodo, setTipoPeriodo] = useState<PeriodType>("mensual");
  const [year, setYear] = useState(previousMonth.year());
  const [month, setMonth] = useState(previousMonth.month() + 1);
  const [semestre, setSemestre] = useState<SemesterValue>(
    previousMonth.month() < 6 ? "S1" : "S2"
  );
  const [modoManual, setModoManual] = useState(false);
  const [manualValores, setManualValores] =
    useState<ManualValores>(defaultManualValores);
  const [notas, setNotas] = useState("");
  const [resumenPreview, setResumenPreview] =
    useState<LiquidacionSummaryData | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [diferidoRecibido, setDiferidoRecibido] = useState(0);
  const [alertas, setAlertas] = useState<
    { type: "warning" | "error" | "info"; text: string }[]
  >([]);

  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => currentYear - idx),
    [currentYear]
  );

  const periodoSeleccionado: PeriodSelection = useMemo(
    () =>
      tipoPeriodo === "mensual"
        ? { tipo: "mensual", year, month }
        : { tipo: "semestral", year, semestre },
    [tipoPeriodo, year, month, semestre]
  );

  const periodoInfo = useMemo(
    () => buildPeriodInfo(periodoSeleccionado),
    [periodoSeleccionado]
  );

  // Auto-calculate IVA in real-time from manual bases
  const ivaVentasAutoCalc = useMemo(
    () =>
      calcularIVA({
        base0: 0,
        base5: toNumber(manualValores.ventasBase5),
        base8: toNumber(manualValores.ventasBase8),
        base15: toNumber(manualValores.ventasBase15),
        iva: 0,
      }),
    [manualValores.ventasBase5, manualValores.ventasBase8, manualValores.ventasBase15]
  );

  const ivaComprasAutoCalc = useMemo(
    () =>
      calcularIVA({
        base0: 0,
        base5: toNumber(manualValores.comprasBase5),
        base8: toNumber(manualValores.comprasBase8),
        base15: toNumber(manualValores.comprasBase15),
        iva: 0,
      }),
    [manualValores.comprasBase5, manualValores.comprasBase8, manualValores.comprasBase15]
  );

  useEffect(() => {
    if (!open) {
      setResumenPreview(null);
      setModoManual(false);
      setManualValores(defaultManualValores);
      setNotas("");
      setAlertas([]);
      setDiferidoRecibido(0);
    } else {
      const prev = dayjs().subtract(1, "month");
      setTipoPeriodo("mensual");
      setYear(prev.year());
      setMonth(prev.month() + 1);
      setSemestre(prev.month() < 6 ? "S1" : "S2");
    }
  }, [open]);

  const handleManualChange = (field: keyof ManualValores, value: string) => {
    setManualValores((prev) => ({ ...prev, [field]: value }));
  };

  const verificarPeriodoTerminado = () => {
    if (!periodHasFinished(periodoInfo)) {
      toast.error("El periodo seleccionado aún no finaliza.");
      return false;
    }
    return true;
  };

  const validarPeriodoAnterior = async () => {
    const previousSelection = getPreviousSelection(periodoSeleccionado);
    const previousInfo = buildPeriodInfo(previousSelection);

    const { data: prevClosing, error: prevClosingError } = await supabase
      .from("tax_liquidations")
      .select(
        "id, ct_por_adquisicion, ct_por_retencion, saldo_a_favor, impuesto_causado, credito_favor_adquisicion, total_retenciones_iva_mayor_0"
      )
      .eq("contribuyente_ruc", contribuyenteRuc)
      .eq("fecha_inicio_cierre", previousInfo.startDate)
      .eq("fecha_fin_cierre", previousInfo.endDate)
      .maybeSingle();

    if (prevClosingError) throw prevClosingError;

    const advertencias: string[] = [];

    if (!prevClosing) {
      return { advertencias, ctAdquisicionAnterior: 0, ctRetencionAnterior: 0 };
    }

    // New format: use ct_por_adquisicion and ct_por_retencion (resultante del periodo anterior)
    const ctAdq = Number(prevClosing.ct_por_adquisicion) || 0;
    const ctRet = Number(prevClosing.ct_por_retencion) || 0;

    if (ctAdq > 0 || ctRet > 0) {
      return { advertencias, ctAdquisicionAnterior: ctAdq, ctRetencionAnterior: ctRet };
    }

    // Legacy fallback: distribute saldo_a_favor as CT adquisición
    const saldo = Number(prevClosing.saldo_a_favor) || 0;
    if (saldo > 0) {
      return { advertencias, ctAdquisicionAnterior: saldo, ctRetencionAnterior: 0 };
    }

    const legacyCredit = Math.max(
      0,
      (Number(prevClosing.credito_favor_adquisicion) || 0) +
        (Number(prevClosing.total_retenciones_iva_mayor_0) || 0) -
        (Number(prevClosing.impuesto_causado) || 0)
    );
    return { advertencias, ctAdquisicionAnterior: legacyCredit, ctRetencionAnterior: 0 };
  };

  const obtenerDiferidoRecibido = async (): Promise<number> => {
    // Query past liquidations that have deferred IVA targeting the current period
    const { data: rows, error } = await supabase
      .from("tax_liquidations")
      .select(
        "fecha_inicio_cierre, iva_diferido_monto, iva_diferido_meses"
      )
      .eq("contribuyente_ruc", contribuyenteRuc)
      .gt("iva_diferido_monto", 0);

    if (error || !rows) return 0;

    const currentStart = dayjs(periodoInfo.startDate);
    let total = 0;
    for (const row of rows) {
      const meses = Number(row.iva_diferido_meses) || 0;
      if (meses <= 0) continue;
      const targetDate = dayjs(row.fecha_inicio_cierre).add(meses, "month");
      if (
        targetDate.year() === currentStart.year() &&
        targetDate.month() === currentStart.month()
      ) {
        total += Number(row.iva_diferido_monto) || 0;
      }
    }
    return total;
  };

  const obtenerDatosPeriodo = async () => {
    const [
      { data: ventas, error: ventasError },
      { data: compras, error: comprasError },
      { data: retenciones, error: retencionesError },
    ] = await Promise.all([
      supabase
        .from("ventas")
        .select("subtotal_0, subtotal_5, subtotal_8, subtotal_15, iva")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", periodoInfo.startDate)
        .lte("fecha_emision", periodoInfo.endDate),
      supabase
        .from("compras")
        .select("subtotal_0, subtotal_5, subtotal_8, subtotal_15, iva, total")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", periodoInfo.startDate)
        .lte("fecha_emision", periodoInfo.endDate),
      supabase
        .from("retenciones")
        .select("retencion_valor, retencion_renta_valor")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", periodoInfo.startDate)
        .lte("fecha_emision", periodoInfo.endDate),
    ]);

    if (ventasError) throw ventasError;
    if (comprasError) throw comprasError;
    if (retencionesError) throw retencionesError;

    const ventasRaw = ventas?.reduce(
      (acc, venta) => {
        acc.base0 += Number(venta.subtotal_0) || 0;
        acc.base5 += Number(venta.subtotal_5) || 0;
        acc.base8 += Number(venta.subtotal_8) || 0;
        acc.base15 += Number(venta.subtotal_15) || 0;
        acc.iva += Number(venta.iva) || 0;
        return acc;
      },
      { base0: 0, base5: 0, base8: 0, base15: 0, iva: 0 }
    ) ?? { base0: 0, base5: 0, base8: 0, base15: 0, iva: 0 };
    const ventasTotales = {
      base0: round2(ventasRaw.base0), base5: round2(ventasRaw.base5),
      base8: round2(ventasRaw.base8), base15: round2(ventasRaw.base15),
      iva: round2(ventasRaw.iva),
    };

    const comprasRaw = compras?.reduce(
      (acc, compra) => {
        acc.base0 += Number(compra.subtotal_0) || 0;
        acc.base5 += Number(compra.subtotal_5) || 0;
        acc.base8 += Number(compra.subtotal_8) || 0;
        acc.base15 += Number(compra.subtotal_15) || 0;
        acc.iva += Number(compra.iva) || 0;
        return acc;
      },
      { base0: 0, base5: 0, base8: 0, base15: 0, iva: 0 }
    ) ?? { base0: 0, base5: 0, base8: 0, base15: 0, iva: 0 };
    const comprasTotales = {
      base0: round2(comprasRaw.base0), base5: round2(comprasRaw.base5),
      base8: round2(comprasRaw.base8), base15: round2(comprasRaw.base15),
      iva: round2(comprasRaw.iva),
    };

    const retencionesRenta = round2(
      retenciones?.reduce(
        (sum, ret) => sum + (Number(ret.retencion_renta_valor) || 0),
        0
      ) ?? 0
    );

    const retencionesIva = round2(
      retenciones?.reduce(
        (sum, ret) => sum + (Number(ret.retencion_valor) || 0),
        0
      ) ?? 0
    );

    return { ventasTotales, comprasTotales, retencionesRenta, retencionesIva };
  };

  const handleCalcular = async () => {
    if (!contribuyenteRuc) return;
    if (!verificarPeriodoTerminado()) return;

    setCalculando(true);
    setAlertas([]);
    setResumenPreview(null);

    try {
      // Validar periodo actual no esté duplicado
      const { data: existing, error: existingError } = await supabase
        .from("tax_liquidations")
        .select("id")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .eq("fecha_inicio_cierre", periodoInfo.startDate)
        .eq("fecha_fin_cierre", periodoInfo.endDate)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        toast.error("Este periodo ya cuenta con un cierre registrado.");
        setCalculando(false);
        return;
      }

      const [
        { advertencias, ctAdquisicionAnterior, ctRetencionAnterior },
        ivaDiferidoRecibidoDB,
      ] = await Promise.all([
        validarPeriodoAnterior(),
        obtenerDiferidoRecibido(),
      ]);

      setDiferidoRecibido(ivaDiferidoRecibidoDB);

      let resumen: LiquidacionSummaryData;

      if (modoManual) {
        resumen = calculateLiquidacionResumen({
          periodo: periodoInfo,
          tipoPeriodo,
          ventas: {
            base0: toNumber(manualValores.ventasBase0),
            base5: toNumber(manualValores.ventasBase5),
            base8: toNumber(manualValores.ventasBase8),
            base15: toNumber(manualValores.ventasBase15),
          },
          compras: {
            base0: toNumber(manualValores.comprasBase0),
            base5: toNumber(manualValores.comprasBase5),
            base8: toNumber(manualValores.comprasBase8),
            base15: toNumber(manualValores.comprasBase15),
          },
          ctPorAdquisicionAnterior: toNumber(manualValores.ctAdquisicionAnterior),
          ctPorRetencionAnterior: toNumber(manualValores.ctRetencionAnterior),
          retencionesIvaPeriodo: toNumber(manualValores.retencionesIvaPeriodo),
          retencionesRenta: toNumber(manualValores.retencionesRenta),
          rentaAPagar: toNumber(manualValores.rentaAPagar),
          ivaDiferidoMonto: toNumber(manualValores.ivaDiferidoMonto),
          mesesDiferimiento: toNumber(manualValores.mesesDiferimiento),
          ivaDiferidoRecibido: ivaDiferidoRecibidoDB,
          advertencias,
          modoManual: true,
          notas,
        });
      } else {
        const {
          ventasTotales,
          comprasTotales,
          retencionesRenta,
          retencionesIva,
        } = await obtenerDatosPeriodo();

        if (
          ventasTotales.base0 +
            ventasTotales.base5 +
            ventasTotales.base8 +
            ventasTotales.base15 +
            comprasTotales.base0 +
            comprasTotales.base5 +
            comprasTotales.base8 +
            comprasTotales.base15 ===
          0
        ) {
          advertencias.push(
            "No se encontraron ventas ni compras registradas en el periodo. Revisa que la información esté cargada."
          );
        }

        resumen = calculateLiquidacionResumen({
          periodo: periodoInfo,
          tipoPeriodo,
          ventas: ventasTotales,
          compras: comprasTotales,
          ctPorAdquisicionAnterior: ctAdquisicionAnterior,
          ctPorRetencionAnterior: ctRetencionAnterior,
          retencionesIvaPeriodo: retencionesIva,
          retencionesRenta,
          rentaAPagar: 0,
          ivaDiferidoRecibido: ivaDiferidoRecibidoDB,
          advertencias,
          modoManual: false,
          notas,
        });

        // Prellenar formulario manual para posibles ajustes
        setManualValores({
          ventasBase0: ventasTotales.base0.toString(),
          ventasBase5: ventasTotales.base5.toString(),
          ventasBase8: ventasTotales.base8.toString(),
          ventasBase15: ventasTotales.base15.toString(),
          comprasBase0: comprasTotales.base0.toString(),
          comprasBase5: comprasTotales.base5.toString(),
          comprasBase8: comprasTotales.base8.toString(),
          comprasBase15: comprasTotales.base15.toString(),
          ctAdquisicionAnterior: ctAdquisicionAnterior.toString(),
          ctRetencionAnterior: ctRetencionAnterior.toString(),
          retencionesIvaPeriodo: retencionesIva.toString(),
          retencionesRenta: retencionesRenta.toString(),
          rentaAPagar: "0",
          ivaDiferidoMonto: "0",
          mesesDiferimiento: "0",
        });
      }

      setAlertas(
        resumen.ajustes.advertencias.map((text) => ({
          type: "warning" as const,
          text,
        }))
      );
      setResumenPreview(resumen);
      toast.success("Cálculo generado. Revisa el detalle antes de guardar.");
    } catch (error) {
      console.error(error);
      setAlertas([
        {
          type: "error",
          text: (error as Error).message ?? "Error desconocido.",
        },
      ]);
      toast.error("No se pudo generar el cierre.");
    } finally {
      setCalculando(false);
    }
  };

  const handleGuardar = async () => {
    if (!resumenPreview) {
      toast.error("Primero debes calcular el cierre.");
      return;
    }
    setGuardando(true);
    try {
      const resumenAGuardar: LiquidacionSummaryData = {
        ...resumenPreview,
        notas,
      };

      const payload = buildInsertPayloadFromSummary(
        contribuyenteRuc,
        resumenAGuardar
      );

      const { error } = await supabase
        .from("tax_liquidations")
        .insert([payload]);

      if (error) throw error;

      toast.success("Cierre guardado correctamente.");
      onCreated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar el cierre.");
    } finally {
      setGuardando(false);
    }
  };

  const modoSeleccionado = (value: PeriodType) =>
    setTipoPeriodo(value === "mensual" ? "mensual" : "semestral");

  const manualToggle = (value: boolean) => {
    setModoManual(value);
    if (value && resumenPreview) {
      setManualValores({
        ventasBase0: resumenPreview.ventas.base0.toString(),
        ventasBase5: resumenPreview.ventas.base5.toString(),
        ventasBase8: resumenPreview.ventas.base8.toString(),
        ventasBase15: resumenPreview.ventas.base15.toString(),
        comprasBase0: resumenPreview.compras.base0.toString(),
        comprasBase5: resumenPreview.compras.base5.toString(),
        comprasBase8: resumenPreview.compras.base8.toString(),
        comprasBase15: resumenPreview.compras.base15.toString(),
        ctAdquisicionAnterior: resumenPreview.creditoTributario.ctPorAdquisicionAnterior.toString(),
        ctRetencionAnterior: resumenPreview.creditoTributario.ctPorRetencionAnterior.toString(),
        retencionesIvaPeriodo: resumenPreview.creditoTributario.retencionesIvaPeriodo.toString(),
        retencionesRenta: resumenPreview.retencionesRenta.toString(),
        rentaAPagar: resumenPreview.calculo.rentaAPagar.toString(),
        ivaDiferidoMonto: resumenPreview.ivaDiferido.ivaDiferidoMonto.toString(),
        mesesDiferimiento: resumenPreview.ivaDiferido.mesesDiferimiento.toString(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-full max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar cierre de IVA</DialogTitle>
          <DialogDescription>
            Selecciona el periodo, calcula la liquidación y confirma para
            guardarla en el historial. Puedes alternar entre cálculo automático
            o registro manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <section className="rounded-lg border p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Tipo de periodo
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant={tipoPeriodo === "mensual" ? "default" : "outline"}
                    onClick={() => modoSeleccionado("mensual")}
                  >
                    Mensual
                  </Button>
                  <Button
                    type="button"
                    variant={
                      tipoPeriodo === "semestral" ? "default" : "outline"
                    }
                    onClick={() => modoSeleccionado("semestral")}
                  >
                    Semestral
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap gap-4">
                <div className="min-w-[140px] space-y-2">
                  <Label>Año</Label>
                  <Select
                    value={year.toString()}
                    onValueChange={(value) => setYear(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tipoPeriodo === "mensual" ? (
                  <div className="min-w-[180px] space-y-2">
                    <Label>Mes</Label>
                    <Select
                      value={month.toString()}
                      onValueChange={(value) => setMonth(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="min-w-[180px] space-y-2">
                    <Label>Semestre</Label>
                    <Select
                      value={semestre}
                      onValueChange={(value) =>
                        setSemestre(value as SemesterValue)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Semestre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S1">
                          1er semestre (Ene-Jun)
                        </SelectItem>
                        <SelectItem value="S2">
                          2do semestre (Jul-Dic)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
              <div>
                Periodo seleccionado:{" "}
                <span className="font-medium text-foreground">
                  {periodoInfo.label}
                </span>{" "}
                ({periodoInfo.startDate} — {periodoInfo.endDate})
              </div>
              <div>
                No se permiten cierres del mes en curso ({today.format("MMMM")})
              </div>
            </div>
          </section>

          <Separator />

          <section className="rounded-lg border p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Método de cálculo
                </p>
                <h4 className="text-base font-semibold">
                  {modoManual ? "Ingreso manual" : "Cálculo automático"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {modoManual
                    ? "Ingresa manualmente las bases imponibles. El IVA se calcula automáticamente."
                    : "Tomaremos automáticamente las ventas, compras y retenciones registradas."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={modoManual ? "outline" : "default"}
                  className="gap-2"
                  onClick={() => manualToggle(false)}
                >
                  <Sliders className="h-4 w-4" />
                  Automático
                </Button>
                <Button
                  type="button"
                  variant={modoManual ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => manualToggle(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Manual
                </Button>
              </div>
            </div>

            {modoManual && (
              <>
                {/* Ventas & Compras bases */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm font-semibold">Ventas</p>
                    {[
                      { label: "Base 0%", field: "ventasBase0" },
                      { label: "Base 5%", field: "ventasBase5" },
                      { label: "Base 8%", field: "ventasBase8" },
                      { label: "Base 15%", field: "ventasBase15" },
                    ].map((item) => (
                      <div key={item.field} className="space-y-1.5">
                        <Label>{item.label}</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={manualValores[item.field as keyof ManualValores]}
                          onChange={(e) =>
                            handleManualChange(
                              item.field as keyof ManualValores,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <Label>IVA Ventas (auto-calculado)</Label>
                      <Input
                        type="text"
                        value={formatCurrency(ivaVentasAutoCalc)}
                        readOnly
                        disabled
                        className="bg-muted font-semibold text-green-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm font-semibold">Compras</p>
                    {[
                      { label: "Base 0%", field: "comprasBase0" },
                      { label: "Base 5%", field: "comprasBase5" },
                      { label: "Base 8%", field: "comprasBase8" },
                      { label: "Base 15%", field: "comprasBase15" },
                    ].map((item) => (
                      <div key={item.field} className="space-y-1.5">
                        <Label>{item.label}</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={manualValores[item.field as keyof ManualValores]}
                          onChange={(e) =>
                            handleManualChange(
                              item.field as keyof ManualValores,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <Label>IVA Compras (auto-calculado)</Label>
                      <Input
                        type="text"
                        value={formatCurrency(ivaComprasAutoCalc)}
                        readOnly
                        disabled
                        className="bg-muted font-semibold text-sky-600"
                      />
                    </div>
                  </div>
                </div>

                {/* CT + IVA Diferido */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm font-semibold">Crédito tributario anterior</p>
                    <p className="text-xs text-muted-foreground">
                      Saldos de CT del periodo anterior. Se aplican con prelación: primero adquisición, luego retención.
                    </p>
                    <div className="space-y-1.5">
                      <Label>CT adquisición anterior</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={manualValores.ctAdquisicionAnterior}
                        onChange={(e) =>
                          handleManualChange("ctAdquisicionAnterior", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CT retención anterior</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={manualValores.ctRetencionAnterior}
                        onChange={(e) =>
                          handleManualChange("ctRetencionAnterior", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Retenciones IVA del periodo</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={manualValores.retencionesIvaPeriodo}
                        onChange={(e) =>
                          handleManualChange("retencionesIvaPeriodo", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm font-semibold">IVA diferido</p>
                    <div className="space-y-1.5">
                      <Label>IVA Ventas total</Label>
                      <Input
                        type="text"
                        value={formatCurrency(ivaVentasAutoCalc)}
                        readOnly
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>IVA a diferir</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={manualValores.ivaDiferidoMonto}
                        onChange={(e) => {
                          const val = toNumber(e.target.value);
                          if (val > ivaVentasAutoCalc) {
                            handleManualChange(
                              "ivaDiferidoMonto",
                              ivaVentasAutoCalc.toString()
                            );
                          } else {
                            handleManualChange("ivaDiferidoMonto", e.target.value);
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Meses de diferimiento</Label>
                      <Select
                        value={manualValores.mesesDiferimiento}
                        onValueChange={(value) =>
                          handleManualChange("mesesDiferimiento", value)
                        }
                        disabled={toNumber(manualValores.ivaDiferidoMonto) === 0}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sin diferir</SelectItem>
                          <SelectItem value="1">1 mes</SelectItem>
                          <SelectItem value="2">2 meses</SelectItem>
                          <SelectItem value="3">3 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>IVA diferido recibido</Label>
                      <Input
                        type="text"
                        value={formatCurrency(diferidoRecibido)}
                        readOnly
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Retenciones de Renta</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={manualValores.retencionesRenta}
                  onChange={(e) =>
                    handleManualChange("retencionesRenta", e.target.value)
                  }
                  disabled={!modoManual}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Renta a pagar</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={manualValores.rentaAPagar}
                  onChange={(e) =>
                    handleManualChange("rentaAPagar", e.target.value)
                  }
                  disabled={!modoManual}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas del cierre</Label>
              <Textarea
                placeholder="Observaciones, ajustes o referencias adicionales."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={modoManual ? 3 : 2}
              />
            </div>
          </section>

          <Separator />

          {alertas.length > 0 && (
            <div className="space-y-2">
              {alertas.map((alerta) => (
                <Alert
                  key={alerta.text}
                  className={cn(
                    alerta.type === "warning" &&
                      "border-amber-200 bg-amber-50 text-amber-900",
                    alerta.type === "error" &&
                      "border-red-200 bg-red-50 text-red-800"
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {alerta.type === "warning" ? "Advertencia" : "Importante"}
                  </AlertTitle>
                  <AlertDescription>{alerta.text}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCalcular} disabled={calculando}>
              {calculando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                "Calcular cierre"
              )}
            </Button>
            {resumenPreview && (
              <span className="text-sm text-muted-foreground">
                Revisa el resumen y confirma para guardar el cierre.
              </span>
            )}
          </div>

          <LiquidacionSummary
            resumen={resumenPreview}
            emptyMessage="Aún no has generado un cálculo para este periodo."
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={!resumenPreview || guardando}
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Confirmar cierre"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
