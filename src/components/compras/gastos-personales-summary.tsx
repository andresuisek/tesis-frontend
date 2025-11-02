"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Compra, RubroCompra } from "@/lib/supabase";
import { Home, UtensilsCrossed, GraduationCap, Heart, Shirt, Plane, Receipt, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface GastosPersonalesSummaryProps {
  compras: Compra[];
  cargasFamiliares: number;
}

// Límites de gastos personales según cargas familiares (Ecuador 2025)
const LIMITES_GASTOS_PERSONALES: Record<number, number> = {
  0: 5588.17,
  1: 7184.79,
  2: 8781.41,
  3: 11176.34,
  4: 13571.27,
  5: 15966.20,
};

const rubrosGastosPersonales: RubroCompra[] = [
  "vivienda",
  "alimentacion",
  "educacion",
  "salud",
  "vestimenta",
  "turismo",
];

const rubrosLabels: Record<RubroCompra, string> = {
  no_definido: "No Definido",
  vivienda: "Vivienda",
  alimentacion: "Alimentación",
  educacion: "Educación",
  salud: "Salud",
  vestimenta: "Vestimenta",
  turismo: "Turismo",
  actividad_profesional: "Actividad Profesional",
};

const rubrosIcons: Record<RubroCompra, React.ReactNode> = {
  no_definido: <Receipt className="h-4 w-4" />,
  vivienda: <Home className="h-4 w-4" />,
  alimentacion: <UtensilsCrossed className="h-4 w-4" />,
  educacion: <GraduationCap className="h-4 w-4" />,
  salud: <Heart className="h-4 w-4" />,
  vestimenta: <Shirt className="h-4 w-4" />,
  turismo: <Plane className="h-4 w-4" />,
  actividad_profesional: <Receipt className="h-4 w-4" />,
};

const rubrosColors: Record<RubroCompra, string> = {
  no_definido: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 border-gray-300",
  vivienda: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-300",
  alimentacion: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-300",
  educacion: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-300",
  salud: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-300",
  vestimenta: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300 border-pink-300",
  turismo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300",
  actividad_profesional: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-300",
};

export function GastosPersonalesSummary({ compras, cargasFamiliares }: GastosPersonalesSummaryProps) {
  // Calcular totales por rubro (solo gastos personales)
  const totalesPorRubro = rubrosGastosPersonales.reduce((acc, rubro) => {
    const total = compras
      .filter((compra) => compra.rubro === rubro)
      .reduce((sum, compra) => sum + compra.total, 0);
    acc[rubro] = total;
    return acc;
  }, {} as Record<RubroCompra, number>);

  // Calcular total general de gastos personales
  const totalGastosPersonales = Object.values(totalesPorRubro).reduce(
    (sum, total) => sum + total,
    0
  );

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(valor);
  };

  // Obtener límite según cargas familiares (máximo 5)
  const cargasParaLimite = Math.min(cargasFamiliares, 5);
  const limiteGastosPersonales = LIMITES_GASTOS_PERSONALES[cargasParaLimite];
  
  // Calcular porcentaje usado
  const porcentajeUsado = (totalGastosPersonales / limiteGastosPersonales) * 100;
  const disponible = Math.max(0, limiteGastosPersonales - totalGastosPersonales);
  
  // Determinar estado visual
  let estado: "ok" | "aviso" | "alerta" = "ok";
  let IconoEstado = CheckCircle;
  let mensajeEstado = "Estás dentro del límite de gastos personales";

  if (porcentajeUsado >= 100) {
    estado = "alerta";
    IconoEstado = AlertCircle;
    mensajeEstado = "Has superado el límite de gastos personales deducibles";
  } else if (porcentajeUsado >= 80) {
    estado = "aviso";
    IconoEstado = AlertTriangle;
    mensajeEstado = "Te estás acercando al límite de gastos personales";
  }

  // Rubros que siempre deben mostrarse (incluso en $0.00)
  const rubrosObligatorios: RubroCompra[] = ["turismo", "educacion", "vestimenta"];

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <CardTitle className="flex items-center justify-between">
            <span className="text-base font-semibold">Gastos personales por categoría</span>
            <Badge
              variant="outline"
              className="rounded-full border-border/60 bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              Total: {formatearMoneda(totalGastosPersonales)}
            </Badge>
          </CardTitle>

          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="flex items-start gap-3 text-sm">
              <IconoEstado
                className={`h-4 w-4 ${
                  estado === "alerta"
                    ? "text-destructive"
                    : estado === "aviso"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
              <div className="space-y-2">
                <p className="font-medium text-foreground">{mensajeEstado}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <strong>Límite:</strong> {formatearMoneda(limiteGastosPersonales)}
                    <span className="ml-1">
                      ({cargasParaLimite} {cargasParaLimite === 1 ? "carga familiar" : "cargas familiares"})
                    </span>
                  </span>
                  <span className={disponible > 0 ? "text-foreground" : "text-destructive font-medium"}>
                    <strong>Disponible:</strong> {formatearMoneda(disponible)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progreso</span>
                    <span className="font-semibold text-foreground">
                      {porcentajeUsado.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={Math.min(porcentajeUsado, 100)} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {rubrosGastosPersonales.map((rubro) => {
            const total = totalesPorRubro[rubro];
            // Mostrar si tiene gastos O si es un rubro obligatorio
            const mostrar = total > 0 || rubrosObligatorios.includes(rubro);
            
            if (!mostrar) return null;

            return (
              <Badge
                key={rubro}
                variant="outline"
                className="flex items-center gap-2 rounded-full border-border/60 bg-muted px-3 py-1 text-xs font-medium text-foreground"
              >
                {rubrosIcons[rubro]}
                <span className="uppercase tracking-wide">{rubrosLabels[rubro]}</span>
                <span className="font-semibold">{formatearMoneda(total)}</span>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

