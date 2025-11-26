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
  calculateLiquidacionResumen,
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
  ventasBase8: string;
  ventasBase15: string;
  ventasIVA: string;
  comprasBase0: string;
  comprasBase8: string;
  comprasBase15: string;
  comprasIVA: string;
  retencionesIVA: string;
  retencionesRenta: string;
  creditoAnterior: string;
  rentaAPagar: string;
}

const defaultManualValores: ManualValores = {
  ventasBase0: "0",
  ventasBase8: "0",
  ventasBase15: "0",
  ventasIVA: "0",
  comprasBase0: "0",
  comprasBase8: "0",
  comprasBase15: "0",
  comprasIVA: "0",
  retencionesIVA: "0",
  retencionesRenta: "0",
  creditoAnterior: "0",
  rentaAPagar: "0",
};

const toNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

  useEffect(() => {
    if (!open) {
      setResumenPreview(null);
      setModoManual(false);
      setManualValores(defaultManualValores);
      setNotas("");
      setAlertas([]);
    } else {
      // Reiniciar a mes anterior cada vez que se abre
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

    const [
      { data: prevClosing, error: prevClosingError },
      ventasPrevias,
      comprasPrevias,
    ] = await Promise.all([
      supabase
        .from("tax_liquidations")
        .select(
          "id, impuesto_causado, credito_favor_adquisicion, total_retenciones_iva_mayor_0"
        )
        .eq("contribuyente_ruc", contribuyenteRuc)
        .eq("fecha_inicio_cierre", previousInfo.startDate)
        .eq("fecha_fin_cierre", previousInfo.endDate)
        .maybeSingle(),
      supabase
        .from("ventas")
        .select("id", { count: "exact", head: true })
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", previousInfo.startDate)
        .lte("fecha_emision", previousInfo.endDate),
      supabase
        .from("compras")
        .select("id", { count: "exact", head: true })
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", previousInfo.startDate)
        .lte("fecha_emision", previousInfo.endDate),
    ]);

    if (prevClosingError) throw prevClosingError;
    if (ventasPrevias.error) throw ventasPrevias.error;
    if (comprasPrevias.error) throw comprasPrevias.error;

    const ventasCount = ventasPrevias.count ?? 0;
    const comprasCount = comprasPrevias.count ?? 0;

    if (ventasCount + comprasCount > 0 && !prevClosing) {
      throw new Error(
        "El periodo anterior tiene registros de ventas/compras pero no se encuentra cerrado."
      );
    }

    const advertencias: string[] = [];
    if (ventasCount + comprasCount === 0 && !prevClosing) {
      advertencias.push(
        "El periodo anterior no registra ventas ni compras. Se continuará bajo advertencia."
      );
    }

    const creditoAnterior = prevClosing
      ? Math.max(
          0,
          (Number(prevClosing.credito_favor_adquisicion) || 0) +
            (Number(prevClosing.total_retenciones_iva_mayor_0) || 0) -
            (Number(prevClosing.impuesto_causado) || 0)
        )
      : 0;

    return { advertencias, creditoAnterior };
  };

  const obtenerDatosPeriodo = async () => {
    const [
      { data: ventas, error: ventasError },
      { data: compras, error: comprasError },
      { data: retenciones, error: retencionesError },
    ] = await Promise.all([
      supabase
        .from("ventas")
        .select("subtotal_0, subtotal_8, subtotal_15, iva")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", periodoInfo.startDate)
        .lte("fecha_emision", periodoInfo.endDate),
      supabase
        .from("compras")
        .select("subtotal_0, subtotal_8, subtotal_15, iva, total")
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

    const ventasTotales = ventas?.reduce(
      (acc, venta) => {
        acc.base0 += Number(venta.subtotal_0) || 0;
        acc.base8 += Number(venta.subtotal_8) || 0;
        acc.base15 += Number(venta.subtotal_15) || 0;
        acc.iva += Number(venta.iva) || 0;
        return acc;
      },
      { base0: 0, base8: 0, base15: 0, iva: 0 }
    ) ?? { base0: 0, base8: 0, base15: 0, iva: 0 };

    const comprasTotales = compras?.reduce(
      (acc, compra) => {
        const total = Number(compra.total) || 0;
        const ivaCompra = Number(compra.iva) || 0;
        if (ivaCompra === 0) {
          acc.base0 += total;
        } else {
          acc.base8 += total;
        }
        acc.iva += ivaCompra;
        return acc;
      },
      { base0: 0, base8: 0, base15: 0, iva: 0 }
    ) ?? { base0: 0, base8: 0, base15: 0, iva: 0 };

    const retencionesIVA =
      retenciones?.reduce(
        (sum, ret) => sum + (Number(ret.retencion_valor) || 0),
        0
      ) ?? 0;
    const retencionesRenta =
      retenciones?.reduce(
        (sum, ret) => sum + (Number(ret.retencion_renta_valor) || 0),
        0
      ) ?? 0;

    if (typeof window !== "undefined") {
      console.log("[Liquidacion] Totales calculados periodo", {
        periodo: periodoInfo.periodoId,
        ventasTotales,
        comprasTotales,
        retencionesIVA,
        retencionesRenta,
      });
    }

    return { ventasTotales, comprasTotales, retencionesIVA, retencionesRenta };
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

      const { advertencias, creditoAnterior } = await validarPeriodoAnterior();

      let resumen: LiquidacionSummaryData;

      if (modoManual) {
        resumen = calculateLiquidacionResumen({
          periodo: periodoInfo,
          tipoPeriodo,
          ventas: {
            base0: toNumber(manualValores.ventasBase0),
            base8: toNumber(manualValores.ventasBase8),
            base15: toNumber(manualValores.ventasBase15),
            iva: toNumber(manualValores.ventasIVA),
          },
          compras: {
            base0: toNumber(manualValores.comprasBase0),
            base8: toNumber(manualValores.comprasBase8),
            base15: toNumber(manualValores.comprasBase15),
            iva: toNumber(manualValores.comprasIVA),
          },
          retencionesIVA: toNumber(manualValores.retencionesIVA),
          retencionesRenta: toNumber(manualValores.retencionesRenta),
          creditoArrastradoAnterior: toNumber(manualValores.creditoAnterior),
          rentaAPagar: toNumber(manualValores.rentaAPagar),
          advertencias,
          modoManual: true,
          notas,
        });
      } else {
        const {
          ventasTotales,
          comprasTotales,
          retencionesIVA,
          retencionesRenta,
        } = await obtenerDatosPeriodo();

        if (
          ventasTotales.base0 +
            ventasTotales.base8 +
            ventasTotales.base15 +
            comprasTotales.base0 +
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
          retencionesIVA,
          retencionesRenta,
          creditoArrastradoAnterior: creditoAnterior,
          rentaAPagar: 0,
          advertencias,
          modoManual: false,
          notas,
        });

        // Prellenar formulario manual para posibles ajustes
        setManualValores({
          ventasBase0: ventasTotales.base0.toString(),
          ventasBase8: ventasTotales.base8.toString(),
          ventasBase15: ventasTotales.base15.toString(),
          ventasIVA: ventasTotales.iva.toString(),
          comprasBase0: comprasTotales.base0.toString(),
          comprasBase8: comprasTotales.base8.toString(),
          comprasBase15: comprasTotales.base15.toString(),
          comprasIVA: comprasTotales.iva.toString(),
          retencionesIVA: retencionesIVA.toString(),
          retencionesRenta: retencionesRenta.toString(),
          creditoAnterior: creditoAnterior.toString(),
          rentaAPagar: "0",
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
      // Prellenar con datos actuales
      setManualValores({
        ventasBase0: resumenPreview.ventas.base0.toString(),
        ventasBase8: resumenPreview.ventas.base8.toString(),
        ventasBase15: resumenPreview.ventas.base15.toString(),
        ventasIVA: resumenPreview.ventas.iva.toString(),
        comprasBase0: resumenPreview.compras.base0.toString(),
        comprasBase8: resumenPreview.compras.base8.toString(),
        comprasBase15: resumenPreview.compras.base15.toString(),
        comprasIVA: resumenPreview.compras.iva.toString(),
        retencionesIVA: resumenPreview.retenciones.iva.toString(),
        retencionesRenta: resumenPreview.retenciones.renta.toString(),
        creditoAnterior:
          resumenPreview.ajustes.creditoArrastradoAnterior.toString(),
        rentaAPagar: resumenPreview.calculo.rentaAPagar.toString(),
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
                    ? "Ingresa manualmente los valores a consolidar."
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
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-md border p-4">
                  <p className="text-sm font-semibold">Ventas</p>
                  {[
                    { label: "Base 0%", field: "ventasBase0" },
                    { label: "Base gravada (IVA)", field: "ventasBase8" },
                    { label: "Base 15%", field: "ventasBase15" },
                    { label: "IVA causado", field: "ventasIVA" },
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
                </div>
                <div className="space-y-3 rounded-md border p-4">
                  <p className="text-sm font-semibold">Compras</p>
                  {[
                    { label: "Base 0%", field: "comprasBase0" },
                    { label: "Base gravada (IVA)", field: "comprasBase8" },
                    { label: "Base 15%", field: "comprasBase15" },
                    { label: "IVA crédito", field: "comprasIVA" },
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
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Retenciones de IVA</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={manualValores.retencionesIVA}
                  onChange={(e) =>
                    handleManualChange("retencionesIVA", e.target.value)
                  }
                  disabled={!modoManual}
                />
              </div>
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
                <Label>Crédito arrastrado anterior</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={manualValores.creditoAnterior}
                  onChange={(e) =>
                    handleManualChange("creditoAnterior", e.target.value)
                  }
                  disabled={!modoManual}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="space-y-1.5">
                <Label>Notas del cierre</Label>
                <Textarea
                  placeholder="Observaciones, ajustes o referencias adicionales."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={modoManual ? 3 : 2}
                />
              </div>
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
