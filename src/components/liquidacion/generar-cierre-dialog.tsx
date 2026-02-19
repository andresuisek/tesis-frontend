"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Calculator, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GenerarCierreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCierreGenerado: () => void;
  contribuyenteRuc: string;
  tipoObligacion: "mensual" | "semestral";
}

interface CalculoResultado {
  // Compras
  total_compras_iva_0: number;
  total_compras_iva_mayor_0: number;
  total_compras_iva: number;

  // Ventas
  total_ventas_iva_0: number;
  total_ventas_iva_mayor_0: number;
  total_ventas_iva: number;

  // Notas de crédito
  total_nc_iva_mayor_0: number;

  // Retenciones
  total_retenciones_iva_mayor_0: number;

  // Cálculos
  credito_favor_adquisicion: number;
  credito_favor_retencion: number;
  impuesto_causado: number;
  impuesto_pagar_sri: number;

  // Créditos previos del período anterior
  credito_tributario_previo: number;
  credito_retencion_previo: number;
}

export function GenerarCierreDialog({
  open,
  onOpenChange,
  onCierreGenerado,
  contribuyenteRuc,
  tipoObligacion,
}: GenerarCierreDialogProps) {
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [año, setAño] = useState(dayjs().year().toString());
  const [mes, setMes] = useState<string>("");
  const [semestre, setSemestre] = useState<string>("");
  const [resultado, setResultado] = useState<CalculoResultado | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [validacionError, setValidacionError] = useState<string>("");
  const [validacionAdvertencia, setValidacionAdvertencia] =
    useState<string>("");

  const años = Array.from({ length: 5 }, (_, i) =>
    (dayjs().year() - i).toString()
  );
  const meses = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];
  const semestres = [
    { value: "1", label: "Primer Semestre (Ene - Jun)" },
    { value: "2", label: "Segundo Semestre (Jul - Dic)" },
  ];

  // Calcular fechas cuando cambian los selectores
  useEffect(() => {
    setValidacionError("");
    setValidacionAdvertencia("");
    setResultado(null);

    if (tipoObligacion === "mensual" && mes && año) {
      const inicio = dayjs()
        .year(parseInt(año))
        .month(parseInt(mes) - 1)
        .startOf("month");
      const fin = inicio.endOf("month");
      setFechaInicio(inicio.format("YYYY-MM-DD"));
      setFechaFin(fin.format("YYYY-MM-DD"));
    } else if (tipoObligacion === "semestral" && semestre && año) {
      if (semestre === "1") {
        const inicio = dayjs().year(parseInt(año)).month(0).startOf("month");
        const fin = dayjs().year(parseInt(año)).month(5).endOf("month");
        setFechaInicio(inicio.format("YYYY-MM-DD"));
        setFechaFin(fin.format("YYYY-MM-DD"));
      } else {
        const inicio = dayjs().year(parseInt(año)).month(6).startOf("month");
        const fin = dayjs().year(parseInt(año)).month(11).endOf("month");
        setFechaInicio(inicio.format("YYYY-MM-DD"));
        setFechaFin(fin.format("YYYY-MM-DD"));
      }
    }
  }, [año, mes, semestre, tipoObligacion]);

  const validarPeriodo = async (): Promise<boolean> => {
    if (!fechaInicio || !fechaFin) {
      setValidacionError("Debe seleccionar un período válido");
      return false;
    }

    // Validación 1: No permitir cierre del período actual
    const hoy = dayjs();
    const finPeriodo = dayjs(fechaFin);

    if (finPeriodo.isAfter(hoy) || finPeriodo.isSame(hoy, "day")) {
      setValidacionError(
        "No se puede generar el cierre del período actual. El período debe haber finalizado."
      );
      return false;
    }

    // Validación 2: Verificar si existe cierre del período anterior
    let fechaInicioPeriodoAnterior: string;
    let fechaFinPeriodoAnterior: string;

    if (tipoObligacion === "mensual") {
      const mesAnterior = dayjs(fechaInicio).subtract(1, "month");
      fechaInicioPeriodoAnterior = mesAnterior
        .startOf("month")
        .format("YYYY-MM-DD");
      fechaFinPeriodoAnterior = mesAnterior.endOf("month").format("YYYY-MM-DD");
    } else {
      // Semestral
      const semestreAnterior = dayjs(fechaInicio).subtract(6, "month");
      fechaInicioPeriodoAnterior = semestreAnterior
        .startOf("month")
        .format("YYYY-MM-DD");
      fechaFinPeriodoAnterior = semestreAnterior
        .add(5, "month")
        .endOf("month")
        .format("YYYY-MM-DD");
    }

    // Buscar si existe un cierre para el período anterior
    const { data: cierreAnterior, error: errorCierreAnterior } = await supabase
      .from("tax_liquidations")
      .select("id")
      .eq("contribuyente_ruc", contribuyenteRuc)
      .eq("fecha_inicio_cierre", fechaInicioPeriodoAnterior)
      .eq("fecha_fin_cierre", fechaFinPeriodoAnterior)
      .is("deleted_at", null)
      .maybeSingle();

    if (errorCierreAnterior) {
      console.error("Error al verificar cierre anterior:", errorCierreAnterior);
    }

    // Si no existe cierre anterior, verificar si hay datos
    if (!cierreAnterior) {
      const periodoAnteriorLabel =
        tipoObligacion === "mensual"
          ? dayjs(fechaInicioPeriodoAnterior).format("MMMM YYYY")
          : `${dayjs(fechaInicioPeriodoAnterior).format("MMM")} - ${dayjs(
              fechaFinPeriodoAnterior
            ).format("MMM YYYY")}`;

      // Verificar si hay datos (ventas, compras, notas de crédito o retenciones) en el período anterior
      const [
        ventasAnteriores,
        comprasAnteriores,
        notasAnteriores,
        retencionesAnteriores,
      ] = await Promise.all([
        supabase
          .from("ventas")
          .select("id", { count: "exact", head: true })
          .eq("contribuyente_ruc", contribuyenteRuc)
          .gte("fecha_emision", fechaInicioPeriodoAnterior)
          .lte("fecha_emision", fechaFinPeriodoAnterior),
        supabase
          .from("compras")
          .select("id", { count: "exact", head: true })
          .eq("contribuyente_ruc", contribuyenteRuc)
          .gte("fecha_emision", fechaInicioPeriodoAnterior)
          .lte("fecha_emision", fechaFinPeriodoAnterior),
        supabase
          .from("notas_credito")
          .select("id", { count: "exact", head: true })
          .eq("contribuyente_ruc", contribuyenteRuc)
          .gte("fecha_emision", fechaInicioPeriodoAnterior)
          .lte("fecha_emision", fechaFinPeriodoAnterior),
        supabase
          .from("retenciones")
          .select("id", { count: "exact", head: true })
          .eq("contribuyente_ruc", contribuyenteRuc)
          .gte("fecha_emision", fechaInicioPeriodoAnterior)
          .lte("fecha_emision", fechaFinPeriodoAnterior),
      ]);

      const totalRegistrosAnteriores =
        (ventasAnteriores.count || 0) +
        (comprasAnteriores.count || 0) +
        (notasAnteriores.count || 0) +
        (retencionesAnteriores.count || 0);

      if (totalRegistrosAnteriores > 0) {
        // Hay datos sin cierre → BLOQUEAR
        setValidacionError(
          `El período anterior (${periodoAnteriorLabel}) tiene ${totalRegistrosAnteriores} registro(s) sin liquidar. Debe cerrar primero el período anterior o usar la opción de ingreso manual.`
        );
        return false;
      } else {
        // No hay datos → ADVERTENCIA pero permitir
        setValidacionAdvertencia(
          `El período anterior (${periodoAnteriorLabel}) no tiene registros ni cierre. Se asume que no hubo operaciones en ese período.`
        );
        // Continuar con la validación, no retornar false
      }
    }

    // Validación 3: Verificar si ya existe un cierre para este período
    const { data: cierreExistente, error: errorCierreExistente } =
      await supabase
        .from("tax_liquidations")
        .select("id")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .eq("fecha_inicio_cierre", fechaInicio)
        .eq("fecha_fin_cierre", fechaFin)
        .is("deleted_at", null)
        .maybeSingle();

    if (errorCierreExistente) {
      console.error(
        "Error al verificar cierre existente:",
        errorCierreExistente
      );
    }

    if (cierreExistente) {
      setValidacionError(
        "Ya existe un cierre registrado para este período. Por favor, elimínelo primero si desea crear uno nuevo."
      );
      return false;
    }

    return true;
  };

  const calcularLiquidacion = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error("Debe seleccionar un período válido");
      return;
    }

    setCalculando(true);
    setValidacionError("");
    setValidacionAdvertencia("");

    try {
      // Validar período antes de calcular
      const esValido = await validarPeriodo();
      if (!esValido) {
        setCalculando(false);
        return;
      }
      // 1. Obtener ventas del período
      const { data: ventas, error: errorVentas } = await supabase
        .from("ventas")
        .select("*")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", fechaInicio)
        .lte("fecha_emision", fechaFin);

      if (errorVentas) throw errorVentas;

      // 2. Obtener compras del período
      const { data: compras, error: errorCompras } = await supabase
        .from("compras")
        .select("*")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", fechaInicio)
        .lte("fecha_emision", fechaFin);

      if (errorCompras) throw errorCompras;

      // 3. Obtener notas de crédito del período
      const { data: notasCredito, error: errorNC } = await supabase
        .from("notas_credito")
        .select("*")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", fechaInicio)
        .lte("fecha_emision", fechaFin);

      if (errorNC) throw errorNC;

      // 4. Obtener retenciones del período
      const { data: retenciones, error: errorRetenciones } = await supabase
        .from("retenciones")
        .select("*")
        .eq("contribuyente_ruc", contribuyenteRuc)
        .gte("fecha_emision", fechaInicio)
        .lte("fecha_emision", fechaFin);

      if (errorRetenciones) throw errorRetenciones;

      // ============= CÁLCULOS SEGÚN EL DIAGRAMA DE FLUJO =============

      // Compras - separar IVA = 0 e IVA > 0
      const compras_iva_0 = (compras || [])
        .filter((c) => c.subtotal_0 > 0)
        .reduce((sum, c) => sum + c.subtotal_0, 0);

      const compras_iva_mayor_0 = (compras || []).reduce(
        (sum, c) => sum + c.subtotal_5 + c.subtotal_8 + c.subtotal_15,
        0
      );

      const compras_iva = (compras || []).reduce((sum, c) => sum + c.iva, 0);

      // Ventas - separar IVA = 0 e IVA > 0
      const ventas_iva_0 = (ventas || [])
        .filter((v) => v.subtotal_0 > 0)
        .reduce((sum, v) => sum + v.subtotal_0, 0);

      const ventas_iva_mayor_0 = (ventas || []).reduce(
        (sum, v) => sum + v.subtotal_5 + v.subtotal_8 + v.subtotal_15,
        0
      );

      const ventas_iva = (ventas || []).reduce((sum, v) => sum + v.iva, 0);

      // Notas de crédito - solo IVA > 0
      const nc_iva_mayor_0 = (notasCredito || []).reduce(
        (sum, nc) => sum + nc.iva,
        0
      );

      // Retenciones - IVA
      const retenciones_iva = (retenciones || []).reduce(
        (sum, r) => sum + (r.retencion_valor || 0),
        0
      );

      // ============= OBTENER CRÉDITOS PREVIOS DEL PERÍODO ANTERIOR =============

      let credito_tributario_previo = 0;
      let credito_retencion_previo = 0;

      // Calcular el período anterior
      let fechaInicioPeriodoAnterior: string;
      let fechaFinPeriodoAnterior: string;

      if (tipoObligacion === "mensual") {
        const mesAnterior = dayjs(fechaInicio).subtract(1, "month");
        fechaInicioPeriodoAnterior = mesAnterior
          .startOf("month")
          .format("YYYY-MM-DD");
        fechaFinPeriodoAnterior = mesAnterior
          .endOf("month")
          .format("YYYY-MM-DD");
      } else {
        const semestreAnterior = dayjs(fechaInicio).subtract(6, "month");
        fechaInicioPeriodoAnterior = semestreAnterior
          .startOf("month")
          .format("YYYY-MM-DD");
        fechaFinPeriodoAnterior = semestreAnterior
          .add(5, "month")
          .endOf("month")
          .format("YYYY-MM-DD");
      }

      // Buscar si existe un cierre del período anterior
      const { data: cierreAnterior } = await supabase
        .from("tax_liquidations")
        .select(
          "impuesto_pagar_sri, credito_favor_adquisicion, credito_favor_retencion"
        )
        .eq("contribuyente_ruc", contribuyenteRuc)
        .eq("fecha_inicio_cierre", fechaInicioPeriodoAnterior)
        .eq("fecha_fin_cierre", fechaFinPeriodoAnterior)
        .is("deleted_at", null)
        .maybeSingle();

      // Si existe cierre anterior y hay saldo a favor (impuesto negativo), es un crédito
      if (cierreAnterior) {
        if (cierreAnterior.impuesto_pagar_sri < 0) {
          credito_tributario_previo = Math.abs(
            cierreAnterior.impuesto_pagar_sri
          );
        }
        // También podemos considerar créditos que no fueron utilizados completamente
        credito_retencion_previo = cierreAnterior.credito_favor_retencion || 0;
      }

      // ============= LIQUIDACIÓN SEGÚN DIAGRAMA =============

      // Paso 1: Crédito tributario por adquisiciones (IVA de compras)
      const credito_favor_adquisicion = compras_iva;

      // Paso 2: Impuesto causado inicial (IVA de ventas - Notas de crédito)
      let impuesto_causado = ventas_iva - nc_iva_mayor_0;

      // Paso 3: Verificar si el crédito por adquisición es > 0
      if (credito_favor_adquisicion > 0) {
        // Restar el crédito por adquisición del impuesto causado
        impuesto_causado = impuesto_causado - credito_favor_adquisicion;
      }

      // Paso 4: Crédito por retención
      const credito_favor_retencion = retenciones_iva;

      // Paso 5: Verificar si el crédito por retención es > 0
      if (credito_favor_retencion > 0) {
        // Restar el crédito por retención del impuesto causado
        impuesto_causado = impuesto_causado - credito_favor_retencion;
      }

      // Paso 6: Impuesto a pagar al SRI (Impuesto causado)
      // Si es negativo, significa que hay saldo a favor
      const impuesto_pagar_sri = impuesto_causado;

      const calculoResultado: CalculoResultado = {
        total_compras_iva_0: compras_iva_0,
        total_compras_iva_mayor_0: compras_iva_mayor_0,
        total_compras_iva: compras_iva,
        total_ventas_iva_0: ventas_iva_0,
        total_ventas_iva_mayor_0: ventas_iva_mayor_0,
        total_ventas_iva: ventas_iva,
        total_nc_iva_mayor_0: nc_iva_mayor_0,
        total_retenciones_iva_mayor_0: retenciones_iva,
        credito_favor_adquisicion,
        credito_favor_retencion,
        impuesto_causado: Math.max(0, impuesto_causado), // Solo mostrar si es positivo
        impuesto_pagar_sri,
        credito_tributario_previo,
        credito_retencion_previo,
      };

      setResultado(calculoResultado);
      toast.success("Cálculo realizado exitosamente");
    } catch (error) {
      console.error("Error al calcular liquidación:", error);
      toast.error("Error al calcular la liquidación");
    } finally {
      setCalculando(false);
    }
  };

  const handleGuardar = async () => {
    if (!resultado) {
      toast.error("Debe calcular la liquidación primero");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("tax_liquidations").insert([
        {
          contribuyente_ruc: contribuyenteRuc,
          fecha_inicio_cierre: fechaInicio,
          fecha_fin_cierre: fechaFin,
          total_compras_iva_0: resultado.total_compras_iva_0,
          total_compras_iva_mayor_0: resultado.total_compras_iva_mayor_0,
          total_ventas_iva_0: resultado.total_ventas_iva_0,
          total_ventas_iva_mayor_0: resultado.total_ventas_iva_mayor_0,
          total_nc_iva_mayor_0: resultado.total_nc_iva_mayor_0,
          total_retenciones_iva_mayor_0:
            resultado.total_retenciones_iva_mayor_0,
          credito_favor_adquisicion: resultado.credito_favor_adquisicion,
          credito_favor_retencion: resultado.credito_favor_retencion,
          impuesto_causado: resultado.impuesto_causado,
          impuesto_pagar_sri: resultado.impuesto_pagar_sri,
        },
      ]);

      if (error) throw error;

      toast.success("Liquidación guardada exitosamente");
      onCierreGenerado();
      handleClose();
    } catch (error) {
      console.error("Error al guardar liquidación:", error);
      toast.error("Error al guardar la liquidación");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMes("");
    setSemestre("");
    setResultado(null);
    setFechaInicio("");
    setFechaFin("");
    setValidacionError("");
    setValidacionAdvertencia("");
    onOpenChange(false);
  };

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Generar Cierre de Liquidación
          </DialogTitle>
          <DialogDescription>
            Calcula automáticamente la liquidación de IVA para el período
            seleccionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selección de período */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={año} onValueChange={setAño}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione año" />
                  </SelectTrigger>
                  <SelectContent>
                    {años.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tipoObligacion === "mensual" ? (
                <div className="space-y-2">
                  <Label>Mes</Label>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Semestre</Label>
                  <Select value={semestre} onValueChange={setSemestre}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      {semestres.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {fechaInicio &&
              fechaFin &&
              !validacionError &&
              !validacionAdvertencia && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Período: {dayjs(fechaInicio).format("DD/MM/YYYY")} -{" "}
                    {dayjs(fechaFin).format("DD/MM/YYYY")}
                  </AlertDescription>
                </Alert>
              )}

            {validacionAdvertencia && !validacionError && (
              <Alert className="border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  {validacionAdvertencia}
                </AlertDescription>
              </Alert>
            )}

            {validacionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validacionError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={calcularLiquidacion}
              disabled={
                !fechaInicio || !fechaFin || calculando || !!validacionError
              }
              className="w-full"
            >
              {calculando ? "Calculando..." : "Calcular Liquidación"}
            </Button>
          </div>

          {/* Resultados */}
          {resultado && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">
                  Resumen de Liquidación
                </h3>

                {/* Ventas */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      VENTAS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Ventas IVA 0%:</span>
                      <span>
                        {formatearMoneda(resultado.total_ventas_iva_0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ventas IVA {">"} 0%:</span>
                      <span>
                        {formatearMoneda(resultado.total_ventas_iva_mayor_0)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>IVA Causado (Ventas):</span>
                      <span className="text-green-600">
                        {formatearMoneda(resultado.total_ventas_iva)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Compras */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      COMPRAS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Compras IVA 0%:</span>
                      <span>
                        {formatearMoneda(resultado.total_compras_iva_0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Compras IVA {">"} 0%:</span>
                      <span>
                        {formatearMoneda(resultado.total_compras_iva_mayor_0)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Crédito Tributario:</span>
                      <span className="text-blue-600">
                        {formatearMoneda(resultado.credito_favor_adquisicion)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Retenciones */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      RETENCIONES RECIBIDAS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">
                        Retenciones de IVA del período:
                      </span>
                      <span className="font-semibold text-purple-600">
                        {formatearMoneda(
                          resultado.total_retenciones_iva_mayor_0
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Ajustes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      AJUSTES
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Notas de Crédito (IVA):</span>
                      <span className="text-orange-600">
                        -{formatearMoneda(resultado.total_nc_iva_mayor_0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Créditos Previos del Período Anterior */}
                {(resultado.credito_tributario_previo > 0 ||
                  resultado.credito_retencion_previo > 0) && (
                  <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        💰 CRÉDITOS DEL PERÍODO ANTERIOR
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {resultado.credito_tributario_previo > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700 dark:text-blue-300">
                            Saldo a favor del período anterior:
                          </span>
                          <span className="font-semibold text-blue-700 dark:text-blue-300">
                            {formatearMoneda(
                              resultado.credito_tributario_previo
                            )}
                          </span>
                        </div>
                      )}
                      {resultado.credito_retencion_previo > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700 dark:text-blue-300">
                            Crédito por retención previo:
                          </span>
                          <span className="font-semibold text-blue-700 dark:text-blue-300">
                            {formatearMoneda(
                              resultado.credito_retencion_previo
                            )}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs text-blue-700 dark:text-blue-300">
                        ℹ️ Estos créditos pueden aplicarse a futuros períodos
                        según corresponda
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Total */}
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Impuesto Causado:</span>
                        <span className="font-medium">
                          {formatearMoneda(resultado.impuesto_causado)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        {resultado.impuesto_pagar_sri > 0 ? (
                          <>
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                              <span className="font-semibold text-lg">
                                Impuesto a Pagar:
                              </span>
                            </div>
                            <span className="text-2xl font-bold text-red-600">
                              {formatearMoneda(resultado.impuesto_pagar_sri)}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              <span className="font-semibold text-lg">
                                Saldo a Favor:
                              </span>
                            </div>
                            <span className="text-2xl font-bold text-green-600">
                              {formatearMoneda(
                                Math.abs(resultado.impuesto_pagar_sri)
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          {resultado && (
            <Button onClick={handleGuardar} disabled={loading}>
              {loading ? "Guardando..." : "Guardar Liquidación"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
