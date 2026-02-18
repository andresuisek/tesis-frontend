"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiquidacionSummaryData, formatCurrency } from "@/lib/liquidacion";

interface LiquidacionKPIsProps {
  resumen?: LiquidacionSummaryData | null;
  periodoLabel?: string;
}

export function LiquidacionKPIs({
  resumen,
  periodoLabel,
}: LiquidacionKPIsProps) {
  const impuestoCausado = resumen?.calculo.impuestoCausado || 0;
  const creditoMes = resumen?.calculo.creditoAdquisicionMes || 0;

  const cards = [
    {
      title: "IVA Ventas",
      value: formatCurrency(resumen?.calculo.ivaVentasPeriodo || 0),
      description: "IVA auto-calculado del periodo",
    },
    {
      title: "IVA Compras",
      value: formatCurrency(resumen?.calculo.ivaComprasTotal || 0),
      description: "IVA soportado en compras",
    },
    {
      title: impuestoCausado > 0 ? "Impuesto causado" : "Crédito adquisición",
      value: formatCurrency(impuestoCausado > 0 ? impuestoCausado : creditoMes),
      description: impuestoCausado > 0
        ? "Ventas - Compras del periodo"
        : "Compras exceden ventas",
    },
    {
      title: "Total a pagar",
      value: formatCurrency(resumen?.calculo.totalAPagar || 0),
      description: "Resultado después de ajustes",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {card.title}
            </CardTitle>
            <CardDescription>{periodoLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
