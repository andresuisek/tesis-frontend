"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeclaracionRentaSummaryData, formatCurrency } from "@/lib/declaracion-renta";

interface DeclaracionRentaKPIsProps {
  resumen?: DeclaracionRentaSummaryData | null;
}

export function DeclaracionRentaKPIs({ resumen }: DeclaracionRentaKPIsProps) {
  const impuestoAPagar = resumen?.calculo.impuestoAPagar ?? 0;

  const cards = [
    {
      title: "Ingresos brutos",
      value: formatCurrency(resumen?.calculo.ingresosBrutos ?? 0),
      description: "Total de ingresos del ejercicio fiscal",
    },
    {
      title: "Gastos deducibles",
      value: formatCurrency(resumen?.calculo.gastosPersonales.totalDeducible ?? 0),
      description: "Gastos personales aplicados",
    },
    {
      title: "Base imponible",
      value: formatCurrency(resumen?.calculo.baseImponible ?? 0),
      description: "Renta gravable después de deducciones",
    },
    {
      title: impuestoAPagar >= 0 ? "Impuesto a pagar" : "Saldo a favor",
      value: formatCurrency(Math.abs(impuestoAPagar)),
      description: impuestoAPagar >= 0
        ? "Después de retenciones"
        : "Retenciones exceden impuesto causado",
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
            <CardDescription>
              {resumen ? `Año fiscal ${resumen.anioFiscal}` : ""}
            </CardDescription>
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
