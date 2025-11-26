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
  const cards = [
    {
      title: "IVA causado",
      value: formatCurrency(resumen?.calculo.ivaCausado || 0),
      description: "Ventas gravadas del periodo",
    },
    {
      title: "Crédito compras",
      value: formatCurrency(resumen?.calculo.creditoTributarioCompras || 0),
      description: "IVA soportado en compras",
    },
    {
      title: "Retenciones IVA",
      value: formatCurrency(resumen?.calculo.retencionesIVA || 0),
      description: "Aplicadas en el periodo",
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

