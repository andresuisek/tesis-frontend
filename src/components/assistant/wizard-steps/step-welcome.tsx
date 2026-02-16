"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentMessage } from "../agent-message";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";

interface StepWelcomeProps {
  periodo: { mes: number; anio: number };
  onPeriodoChange: (mes: number, anio: number) => void;
  onNext: () => void;
}

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function StepWelcome({
  periodo,
  onPeriodoChange,
  onNext,
}: StepWelcomeProps) {
  const mesActual = MESES.find((m) => m.value === periodo.mes)?.label || "";

  return (
    <div className="space-y-6">
      {/* Mensaje del agente */}
      <AgentMessage
        message={`¡Hola! 👋 Soy tu asistente tributario. Te guiaré paso a paso para cargar tu información de ventas, compras y retenciones. Al finalizar, tendrás un resumen ejecutivo con alertas personalizadas. ¿Comenzamos?`}
      />

      {/* Selector de período */}
      <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Período Tributario
              </h3>
              <p className="text-sm text-muted-foreground">
                Selecciona el mes y año de la información a importar
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mes
              </label>
              <Select
                value={periodo.mes.toString()}
                onValueChange={(value) =>
                  onPeriodoChange(parseInt(value), periodo.anio)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona mes" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Año
              </label>
              <Select
                value={periodo.anio.toString()}
                onValueChange={(value) =>
                  onPeriodoChange(periodo.mes, parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona año" />
                </SelectTrigger>
                <SelectContent>
                  {ANIOS.map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del proceso */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                ¿Qué vamos a hacer?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Cargar tu archivo de <strong>Ventas</strong> del SRI (formato TXT)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Cargar tu archivo de <strong>Compras</strong> del SRI (formato TXT)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Cargar los XML de <strong>Retenciones</strong> recibidas
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Generar un <strong>resumen ejecutivo</strong> con alertas inteligentes
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón de continuar */}
      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          Comenzar con {mesActual} {periodo.anio}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
