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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { DeclaracionRentaSummary } from "./declaracion-renta-summary";
import { toast } from "sonner";
import { supabase, ParametrosAnuales, TramoImpuestoRenta } from "@/lib/supabase";
import {
  DeclaracionRentaSummaryData,
  calculateDeclaracionRenta,
  buildDeclaracionRentaInsertPayload,
  formatCurrency,
} from "@/lib/declaracion-renta";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, Pencil, Sliders } from "lucide-react";

interface GenerarDeclaracionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuyenteRuc: string;
  cargasFamiliares: number;
  onCreated: () => void;
}

interface ManualValores {
  ingresosBrutos: string;
  costosActividad: string;
  gastosVivienda: string;
  gastosAlimentacion: string;
  gastosEducacion: string;
  gastosVestimenta: string;
  gastosSalud: string;
  gastosTurismo: string;
  retencionesRenta: string;
}

const defaultManualValores: ManualValores = {
  ingresosBrutos: "0",
  costosActividad: "0",
  gastosVivienda: "0",
  gastosAlimentacion: "0",
  gastosEducacion: "0",
  gastosVestimenta: "0",
  gastosSalud: "0",
  gastosTurismo: "0",
  retencionesRenta: "0",
};

const toNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function GenerarDeclaracionDialog({
  open,
  onOpenChange,
  contribuyenteRuc,
  cargasFamiliares,
  onCreated,
}: GenerarDeclaracionDialogProps) {
  const currentYear = new Date().getFullYear();
  const [anioFiscal, setAnioFiscal] = useState(currentYear - 1);
  const [modoManual, setModoManual] = useState(false);
  const [manualValores, setManualValores] = useState<ManualValores>(defaultManualValores);
  const [notas, setNotas] = useState("");
  const [resumenPreview, setResumenPreview] =
    useState<DeclaracionRentaSummaryData | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alertas, setAlertas] = useState<
    { type: "warning" | "error" | "info"; text: string }[]
  >([]);

  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => currentYear - 1 - idx),
    [currentYear]
  );

  useEffect(() => {
    if (!open) {
      setResumenPreview(null);
      setModoManual(false);
      setManualValores(defaultManualValores);
      setNotas("");
      setAlertas([]);
    } else {
      setAnioFiscal(currentYear - 1);
    }
  }, [open, currentYear]);

  const handleManualChange = (field: keyof ManualValores, value: string) => {
    setManualValores((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalcular = async () => {
    if (!contribuyenteRuc) return;

    // Validate year has ended
    if (anioFiscal >= currentYear) {
      toast.error("El año fiscal seleccionado aún no ha terminado.");
      return;
    }

    setCalculando(true);
    setAlertas([]);
    setResumenPreview(null);

    try {
      // Check for existing declaration
      const { data: existing, error: existingError } = await supabase
        .from("declaraciones_renta")
        .select("id")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .eq("anio_fiscal", anioFiscal)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        toast.error("Ya existe una declaración para este año fiscal.");
        setCalculando(false);
        return;
      }

      // Load parametros and tramos
      const [
        { data: parametros, error: paramError },
        { data: tramos, error: tramosError },
      ] = await Promise.all([
        supabase
          .from("parametros_anuales")
          .select("*")
          .eq("anio_fiscal", anioFiscal)
          .maybeSingle(),
        supabase
          .from("tramos_impuesto_renta")
          .select("*")
          .eq("anio_fiscal", anioFiscal)
          .order("orden"),
      ]);

      if (paramError) throw paramError;
      if (tramosError) throw tramosError;

      if (!parametros || !tramos || tramos.length === 0) {
        toast.error(
          `No existen parámetros fiscales configurados para el año ${anioFiscal}. Contacta al administrador.`
        );
        setCalculando(false);
        return;
      }

      const advertencias: string[] = [];
      let ingresosBrutos = 0;
      let costosActividad = 0;
      let gastosVivienda = 0;
      let gastosAlimentacion = 0;
      let gastosEducacion = 0;
      let gastosVestimenta = 0;
      let gastosSalud = 0;
      let gastosTurismo = 0;
      let retencionesRenta = 0;

      if (modoManual) {
        ingresosBrutos = toNumber(manualValores.ingresosBrutos);
        costosActividad = toNumber(manualValores.costosActividad);
        gastosVivienda = toNumber(manualValores.gastosVivienda);
        gastosAlimentacion = toNumber(manualValores.gastosAlimentacion);
        gastosEducacion = toNumber(manualValores.gastosEducacion);
        gastosVestimenta = toNumber(manualValores.gastosVestimenta);
        gastosSalud = toNumber(manualValores.gastosSalud);
        gastosTurismo = toNumber(manualValores.gastosTurismo);
        retencionesRenta = toNumber(manualValores.retencionesRenta);
      } else {
        // Auto: query from DB
        const startDate = `${anioFiscal}-01-01`;
        const endDate = `${anioFiscal}-12-31`;

        const [
          { data: ventas, error: ventasErr },
          { data: compras, error: comprasErr },
          { data: retenciones, error: retErr },
        ] = await Promise.all([
          supabase
            .from("ventas")
            .select("subtotal_0, subtotal_5, subtotal_8, subtotal_15")
            .eq("contribuyente_ruc", contribuyenteRuc)
            .gte("fecha_emision", startDate)
            .lte("fecha_emision", endDate),
          supabase
            .from("compras")
            .select("valor_sin_impuesto, rubro")
            .eq("contribuyente_ruc", contribuyenteRuc)
            .gte("fecha_emision", startDate)
            .lte("fecha_emision", endDate),
          supabase
            .from("retenciones")
            .select("retencion_renta_valor")
            .eq("contribuyente_ruc", contribuyenteRuc)
            .gte("fecha_emision", startDate)
            .lte("fecha_emision", endDate),
        ]);

        if (ventasErr) throw ventasErr;
        if (comprasErr) throw comprasErr;
        if (retErr) throw retErr;

        // Sum ingresos brutos from ventas
        ingresosBrutos = round2(
          (ventas ?? []).reduce(
            (sum, v) =>
              sum +
              (Number(v.subtotal_0) || 0) +
              (Number(v.subtotal_5) || 0) +
              (Number(v.subtotal_8) || 0) +
              (Number(v.subtotal_15) || 0),
            0
          )
        );

        // Classify compras by rubro
        let comprasSinRubro = 0;
        let montoSinRubro = 0;
        for (const compra of compras ?? []) {
          const monto = Number(compra.valor_sin_impuesto) || 0;
          switch (compra.rubro) {
            case "actividad_profesional":
              costosActividad += monto;
              break;
            case "vivienda":
              gastosVivienda += monto;
              break;
            case "alimentacion":
              gastosAlimentacion += monto;
              break;
            case "educacion":
              gastosEducacion += monto;
              break;
            case "vestimenta":
              gastosVestimenta += monto;
              break;
            case "salud":
              gastosSalud += monto;
              break;
            case "turismo":
              gastosTurismo += monto;
              break;
            default:
              comprasSinRubro++;
              montoSinRubro += monto;
              break;
          }
        }

        costosActividad = round2(costosActividad);
        gastosVivienda = round2(gastosVivienda);
        gastosAlimentacion = round2(gastosAlimentacion);
        gastosEducacion = round2(gastosEducacion);
        gastosVestimenta = round2(gastosVestimenta);
        gastosSalud = round2(gastosSalud);
        gastosTurismo = round2(gastosTurismo);

        if (comprasSinRubro > 0) {
          advertencias.push(
            `Hay ${comprasSinRubro} compra${comprasSinRubro > 1 ? "s" : ""} (${formatCurrency(montoSinRubro)}) sin rubro asignado que no se incluyeron en el cálculo.`
          );
        }

        if (ingresosBrutos === 0 && costosActividad === 0) {
          advertencias.push(
            "No se encontraron ventas ni compras registradas para este año. Verifica que la información esté cargada."
          );
        }

        // Sum retenciones renta
        retencionesRenta = round2(
          (retenciones ?? []).reduce(
            (sum, r) => sum + (Number(r.retencion_renta_valor) || 0),
            0
          )
        );

        // Prefill manual form
        setManualValores({
          ingresosBrutos: ingresosBrutos.toString(),
          costosActividad: costosActividad.toString(),
          gastosVivienda: gastosVivienda.toString(),
          gastosAlimentacion: gastosAlimentacion.toString(),
          gastosEducacion: gastosEducacion.toString(),
          gastosVestimenta: gastosVestimenta.toString(),
          gastosSalud: gastosSalud.toString(),
          gastosTurismo: gastosTurismo.toString(),
          retencionesRenta: retencionesRenta.toString(),
        });
      }

      const resumen = calculateDeclaracionRenta({
        anioFiscal,
        ingresosBrutos,
        costosGastosDeducibles: costosActividad,
        gastosVivienda,
        gastosAlimentacion,
        gastosEducacion,
        gastosVestimenta,
        gastosSalud,
        gastosTurismo,
        retencionesRenta,
        cargasFamiliares,
        parametros: parametros as ParametrosAnuales,
        tramos: tramos as TramoImpuestoRenta[],
        ruc: contribuyenteRuc,
        modoManual,
        advertencias,
        notas,
      });

      setAlertas(
        resumen.advertencias.map((text) => ({
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
      toast.error("No se pudo generar la declaración.");
    } finally {
      setCalculando(false);
    }
  };

  const handleGuardar = async () => {
    if (!resumenPreview) {
      toast.error("Primero debes calcular la declaración.");
      return;
    }
    setGuardando(true);
    try {
      const resumenAGuardar: DeclaracionRentaSummaryData = {
        ...resumenPreview,
        notas,
      };

      const payload = buildDeclaracionRentaInsertPayload(
        contribuyenteRuc,
        resumenAGuardar
      );

      const { error } = await supabase
        .from("declaraciones_renta")
        .insert([payload]);

      if (error) throw error;

      toast.success("Declaración guardada correctamente.");
      onCreated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar la declaración.");
    } finally {
      setGuardando(false);
    }
  };

  const manualToggle = (value: boolean) => {
    setModoManual(value);
    if (value && resumenPreview) {
      const c = resumenPreview.calculo;
      const g = c.gastosPersonales;
      setManualValores({
        ingresosBrutos: c.ingresosBrutos.toString(),
        costosActividad: c.costosGastosDeducibles.toString(),
        gastosVivienda: g.vivienda.real.toString(),
        gastosAlimentacion: g.alimentacion.real.toString(),
        gastosEducacion: g.educacion.real.toString(),
        gastosVestimenta: g.vestimenta.real.toString(),
        gastosSalud: g.salud.real.toString(),
        gastosTurismo: g.turismo.real.toString(),
        retencionesRenta: c.retencionesRenta.toString(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-full max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva declaración de Impuesto a la Renta</DialogTitle>
          <DialogDescription>
            Selecciona el año fiscal, calcula la declaración y confirma para
            guardarla. Puedes alternar entre cálculo automático o registro manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Year selector */}
          <section className="rounded-lg border p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[160px] space-y-2">
                <Label>Año fiscal</Label>
                <Select
                  value={anioFiscal.toString()}
                  onValueChange={(value) => setAnioFiscal(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground pt-6">
                Solo se permiten años fiscales ya terminados.
              </div>
            </div>
          </section>

          <Separator />

          {/* Modo de cálculo */}
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
                    ? "Ingresa manualmente los montos de ingresos, gastos y retenciones."
                    : "Tomaremos automáticamente las ventas, compras (por rubro) y retenciones registradas."}
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
                {/* Ingresos y costos */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm font-semibold">Ingresos y costos</p>
                    <div className="space-y-1.5">
                      <Label>Ingresos brutos</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={manualValores.ingresosBrutos}
                        onChange={(e) =>
                          handleManualChange("ingresosBrutos", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Costos actividad profesional</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={manualValores.costosActividad}
                        onChange={(e) =>
                          handleManualChange("costosActividad", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Retenciones en la fuente (renta)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={manualValores.retencionesRenta}
                        onChange={(e) =>
                          handleManualChange("retencionesRenta", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Gastos personales */}
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm font-semibold">Gastos personales</p>
                    {[
                      { label: "Vivienda", field: "gastosVivienda" },
                      { label: "Alimentación", field: "gastosAlimentacion" },
                      { label: "Educación", field: "gastosEducacion" },
                      { label: "Vestimenta", field: "gastosVestimenta" },
                      { label: "Salud", field: "gastosSalud" },
                      { label: "Turismo", field: "gastosTurismo" },
                    ].map((item) => (
                      <div key={item.field} className="space-y-1.5">
                        <Label>{item.label}</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={
                            manualValores[item.field as keyof ManualValores]
                          }
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
              </>
            )}

            <div className="space-y-1.5">
              <Label>Notas de la declaración</Label>
              <Textarea
                placeholder="Observaciones o referencias adicionales."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
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
                "Calcular declaración"
              )}
            </Button>
            {resumenPreview && (
              <span className="text-sm text-muted-foreground">
                Revisa el resumen y confirma para guardar la declaración.
              </span>
            )}
          </div>

          <DeclaracionRentaSummary
            resumen={resumenPreview}
            emptyMessage="Aún no has generado un cálculo para este año fiscal."
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
              "Confirmar declaración"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
