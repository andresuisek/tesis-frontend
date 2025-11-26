"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import dayjs from "dayjs";
import { FileEdit, AlertCircle, CheckCircle2 } from "lucide-react";

interface IngresoManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLiquidacionCreada: () => void;
  contribuyenteRuc: string;
  tipoObligacion: "mensual" | "semestral";
}

export function IngresoManualDialog({
  open,
  onOpenChange,
  onLiquidacionCreada,
  contribuyenteRuc,
  tipoObligacion,
}: IngresoManualDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [validacionError, setValidacionError] = useState<string>("");

  // Período
  const [año, setAño] = useState(dayjs().year().toString());
  const [mes, setMes] = useState<string>("");
  const [semestre, setSemestre] = useState<string>("");

  // Compras
  const [comprasIva0, setComprasIva0] = useState("");
  const [comprasIvaMayor0, setComprasIvaMayor0] = useState("");
  
  // Ventas
  const [ventasIva0, setVentasIva0] = useState("");
  const [ventasIvaMayor0, setVentasIvaMayor0] = useState("");
  
  // Créditos tributarios
  const [creditoAdquisicion, setCreditoAdquisicion] = useState("");
  const [creditoRetencion, setCreditoRetencion] = useState("");
  
  // Notas de crédito
  const [notasCreditoIva, setNotasCreditoIva] = useState("");
  
  // Retenciones
  const [retencionesIva, setRetencionesIva] = useState("");

  const años = Array.from({ length: 5 }, (_, i) => (dayjs().year() - i).toString());
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

  // Cálculos automáticos
  const comprasIva0Num = parseFloat(comprasIva0) || 0;
  const comprasIvaMayor0Num = parseFloat(comprasIvaMayor0) || 0;
  const ventasIva0Num = parseFloat(ventasIva0) || 0;
  const ventasIvaMayor0Num = parseFloat(ventasIvaMayor0) || 0;
  const creditoAdquisicionNum = parseFloat(creditoAdquisicion) || 0;
  const creditoRetencionNum = parseFloat(creditoRetencion) || 0;
  const notasCreditoIvaNum = parseFloat(notasCreditoIva) || 0;
  const retencionesIvaNum = parseFloat(retencionesIva) || 0;

  // Calcular IVA de ventas (asumiendo 15%)
  const ivaVentas = ventasIvaMayor0Num * 0.15;

  // Calcular impuesto causado según la lógica del diagrama
  let impuestoCausado = ivaVentas - notasCreditoIvaNum;
  if (creditoAdquisicionNum > 0) {
    impuestoCausado = impuestoCausado - creditoAdquisicionNum;
  }
  if (creditoRetencionNum > 0) {
    impuestoCausado = impuestoCausado - creditoRetencionNum;
  }

  const impuestoPagarSRI = impuestoCausado;

  const obtenerFechas = () => {
    if (tipoObligacion === "mensual" && mes) {
      const inicio = dayjs().year(parseInt(año)).month(parseInt(mes) - 1).startOf("month");
      const fin = inicio.endOf("month");
      return {
        inicio: inicio.format("YYYY-MM-DD"),
        fin: fin.format("YYYY-MM-DD"),
      };
    } else if (tipoObligacion === "semestral" && semestre) {
      if (semestre === "1") {
        const inicio = dayjs().year(parseInt(año)).month(0).startOf("month");
        const fin = dayjs().year(parseInt(año)).month(5).endOf("month");
        return {
          inicio: inicio.format("YYYY-MM-DD"),
          fin: fin.format("YYYY-MM-DD"),
        };
      } else {
        const inicio = dayjs().year(parseInt(año)).month(6).startOf("month");
        const fin = dayjs().year(parseInt(año)).month(11).endOf("month");
        return {
          inicio: inicio.format("YYYY-MM-DD"),
          fin: fin.format("YYYY-MM-DD"),
        };
      }
    }
    return null;
  };

  const validarPeriodo = async (): Promise<boolean> => {
    const fechas = obtenerFechas();
    
    if (!fechas) {
      setValidacionError("Debe seleccionar un período válido");
      return false;
    }

    // Validación 1: No permitir cierre del período actual
    const hoy = dayjs();
    const finPeriodo = dayjs(fechas.fin);
    
    if (finPeriodo.isAfter(hoy) || finPeriodo.isSame(hoy, 'day')) {
      setValidacionError(
        "No se puede generar el cierre del período actual. El período debe haber finalizado."
      );
      return false;
    }

    // Validación 2: Verificar si ya existe un cierre para este período
    const { data: cierreExistente, error: errorCierreExistente } = await supabase
      .from("tax_liquidations")
      .select("id")
      .eq("contribuyente_ruc", contribuyenteRuc)
      .eq("fecha_inicio_cierre", fechas.inicio)
      .eq("fecha_fin_cierre", fechas.fin)
      .is("deleted_at", null)
      .maybeSingle();

    if (errorCierreExistente) {
      console.error("Error al verificar cierre existente:", errorCierreExistente);
    }

    if (cierreExistente) {
      setValidacionError(
        "Ya existe un cierre registrado para este período. Por favor, elimínelo primero si desea crear uno nuevo."
      );
      return false;
    }

    return true;
  };

  const handleMostrarResumen = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidacionError("");
    
    const fechas = obtenerFechas();
    
    if (!fechas) {
      toast.error("Debe seleccionar un período válido");
      return;
    }

    // Validar período antes de mostrar resumen
    const esValido = await validarPeriodo();
    if (!esValido) {
      return;
    }

    setMostrarResumen(true);
  };

  const handleGuardar = async () => {
    const fechas = obtenerFechas();
    
    if (!fechas) {
      toast.error("Debe seleccionar un período válido");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("tax_liquidations").insert([
        {
          contribuyente_ruc: contribuyenteRuc,
          fecha_inicio_cierre: fechas.inicio,
          fecha_fin_cierre: fechas.fin,
          total_compras_iva_0: comprasIva0Num,
          total_compras_iva_mayor_0: comprasIvaMayor0Num,
          total_ventas_iva_0: ventasIva0Num,
          total_ventas_iva_mayor_0: ventasIvaMayor0Num,
          total_nc_iva_mayor_0: notasCreditoIvaNum,
          total_retenciones_iva_mayor_0: retencionesIvaNum,
          credito_favor_adquisicion: creditoAdquisicionNum,
          credito_favor_retencion: creditoRetencionNum,
          impuesto_causado: Math.max(0, impuestoCausado),
          impuesto_pagar_sri: impuestoPagarSRI,
        },
      ]);

      if (error) throw error;

      toast.success("Liquidación guardada exitosamente");
      onLiquidacionCreada();
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
    setComprasIva0("");
    setComprasIvaMayor0("");
    setVentasIva0("");
    setVentasIvaMayor0("");
    setCreditoAdquisicion("");
    setCreditoRetencion("");
    setNotasCreditoIva("");
    setRetencionesIva("");
    setMostrarResumen(false);
    setValidacionError("");
    onOpenChange(false);
  };

  const handleVolver = () => {
    setMostrarResumen(false);
    setValidacionError("");
  };

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        {!mostrarResumen ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Ingreso Manual de Liquidación
              </DialogTitle>
              <DialogDescription>
                Ingresa manualmente los valores de la liquidación de IVA
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleMostrarResumen} className="space-y-4 py-4">
              {/* Selección de período */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Período</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Año</Label>
                    <Select value={año} onValueChange={setAño} required>
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
                      <Label>
                        Mes <span className="text-destructive">*</span>
                      </Label>
                      <Select value={mes} onValueChange={setMes} required>
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
                      <Label>
                        Semestre <span className="text-destructive">*</span>
                      </Label>
                      <Select value={semestre} onValueChange={setSemestre} required>
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
              </div>

              <Separator />

              {/* Ventas */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Ventas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ventas-iva-0">Ventas IVA 0%</Label>
                    <Input
                      id="ventas-iva-0"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={ventasIva0}
                      onChange={(e) => setVentasIva0(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ventas-iva-mayor-0">
                      Ventas IVA {">"} 0% <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ventas-iva-mayor-0"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      required
                      value={ventasIvaMayor0}
                      onChange={(e) => setVentasIvaMayor0(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Compras */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Compras</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="compras-iva-0">Compras IVA 0%</Label>
                    <Input
                      id="compras-iva-0"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={comprasIva0}
                      onChange={(e) => setComprasIva0(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compras-iva-mayor-0">Compras IVA {">"} 0%</Label>
                    <Input
                      id="compras-iva-mayor-0"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={comprasIvaMayor0}
                      onChange={(e) => setComprasIvaMayor0(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Créditos Tributarios */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Créditos Tributarios</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credito-adquisicion">Crédito por Adquisición (IVA Compras)</Label>
                    <Input
                      id="credito-adquisicion"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={creditoAdquisicion}
                      onChange={(e) => setCreditoAdquisicion(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credito-retencion">Crédito por Retención</Label>
                    <Input
                      id="credito-retencion"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={creditoRetencion}
                      onChange={(e) => setCreditoRetencion(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Ajustes */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Ajustes</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notas-credito">Notas de Crédito (IVA)</Label>
                    <Input
                      id="notas-credito"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={notasCreditoIva}
                      onChange={(e) => setNotasCreditoIva(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retenciones">Retenciones de IVA</Label>
                    <Input
                      id="retenciones"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={retencionesIva}
                      onChange={(e) => setRetencionesIva(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {validacionError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validacionError}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Ver Resumen
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Resumen de Liquidación</DialogTitle>
              <DialogDescription>
                Verifica los datos antes de guardar la liquidación
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Ventas */}
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">VENTAS</h4>
                  <div className="flex justify-between text-sm">
                    <span>Ventas IVA 0%:</span>
                    <span>{formatearMoneda(ventasIva0Num)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ventas IVA {">"} 0%:</span>
                    <span>{formatearMoneda(ventasIvaMayor0Num)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>IVA Causado (Ventas):</span>
                    <span className="text-green-600">{formatearMoneda(ivaVentas)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Compras */}
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">COMPRAS</h4>
                  <div className="flex justify-between text-sm">
                    <span>Compras IVA 0%:</span>
                    <span>{formatearMoneda(comprasIva0Num)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Compras IVA {">"} 0%:</span>
                    <span>{formatearMoneda(comprasIvaMayor0Num)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Crédito Tributario:</span>
                    <span className="text-blue-600">{formatearMoneda(creditoAdquisicionNum)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Ajustes */}
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">AJUSTES Y CRÉDITOS</h4>
                  <div className="flex justify-between text-sm">
                    <span>Notas de Crédito (IVA):</span>
                    <span className="text-orange-600">-{formatearMoneda(notasCreditoIvaNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Retenciones de IVA:</span>
                    <span className="text-orange-600">-{formatearMoneda(retencionesIvaNum)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Total */}
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Impuesto Causado:</span>
                      <span className="font-medium">{formatearMoneda(Math.max(0, impuestoCausado))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      {impuestoPagarSRI > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-lg">Impuesto a Pagar:</span>
                          </div>
                          <span className="text-2xl font-bold text-red-600">
                            {formatearMoneda(impuestoPagarSRI)}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-lg">Saldo a Favor:</span>
                          </div>
                          <span className="text-2xl font-bold text-green-600">
                            {formatearMoneda(Math.abs(impuestoPagarSRI))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleVolver} disabled={loading}>
                Volver
              </Button>
              <Button onClick={handleGuardar} disabled={loading}>
                {loading ? "Guardando..." : "Confirmar y Guardar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

