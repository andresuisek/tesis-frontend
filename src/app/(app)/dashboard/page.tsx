"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Calculator,
  Receipt,
  Loader2,
  AlertCircle,
  BarChart3,
  Layers,
  TrendingUp,
  PieChart as PieChartIcon,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useAvailableYears } from "@/hooks/use-available-years";
import { useDateFilter } from "@/contexts/date-filter-context";

dayjs.extend(relativeTime);
dayjs.locale("es");

const monthlyFlowConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  compras: { label: "Compras", color: "var(--chart-2)" },
};

const ivaChartConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  compras: { label: "Compras", color: "var(--chart-3)" },
};

const ajustesChartConfig = {
  retenciones: { label: "Retenciones", color: "var(--chart-4)" },
  notasCredito: { label: "Notas de crédito", color: "var(--chart-5)" },
};

const rubroChartConfig = {
  total: { label: "Total", color: "var(--chart-1)" },
};

const taxColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

const rubroLabels: Record<string, string> = {
  vivienda: "Vivienda",
  alimentacion: "Alimentación",
  educacion: "Educación",
  salud: "Salud",
  vestimenta: "Vestimenta",
  turismo: "Turismo",
  actividad_profesional: "Actividad profesional",
  no_definido: "No definido",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(
    value || 0
  );

type MetricChange = {
  value: number;
  positive: boolean;
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  change?: MetricChange;
  helper?: string;
}

function MetricCard({ title, value, icon: Icon, change, helper }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </CardTitle>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        </div>
        {change ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`font-medium ${change.positive ? "text-primary" : "text-destructive"}`}>
              {change.positive ? "+" : ""}
              {change.value.toFixed(1)}%
            </span>
            <span>vs. mes anterior</span>
          </div>
        ) : null}
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </CardHeader>
    </Card>
  );
}

export default function DashboardPage() {
  const {
    kpis,
    monthlyData,
    taxDistribution,
    rubroDistribution,
    ivaBreakdown,
    recentActivity,
    loading,
    error,
  } = useDashboardData();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears } = useAvailableYears("ventas");
  const periodBadgeLabel =
    selectedMonth !== null
      ? dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .format("MMMM YYYY")
      : `Año ${selectedYear}`;

  const ventasChange =
    kpis.ventasMesAnterior > 0
      ? ((kpis.ventasMes - kpis.ventasMesAnterior) / kpis.ventasMesAnterior) * 100
      : 0;

  const comprasChange =
    kpis.comprasMesAnterior > 0
      ? ((kpis.comprasMes - kpis.comprasMesAnterior) / kpis.comprasMesAnterior) * 100
      : 0;

  const retencionesChange =
    kpis.retencionesMesAnterior > 0
      ? ((kpis.retencionesMes - kpis.retencionesMesAnterior) /
          kpis.retencionesMesAnterior) * 100
      : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  const rubrosData = rubroDistribution.map((item) => ({
    rubro: rubroLabels[item.rubro] ?? item.rubro,
    total: item.total,
  }));

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Resumen tributario
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Visualiza tus métricas clave y el desempeño de tus obligaciones fiscales.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-primary text-primary">
            {periodBadgeLabel}
          </Badge>
          <Button variant="outline">Generar reporte</Button>
        </div>
      </div>

      <TaxPeriodFilter availableYears={availableYears} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Ventas del mes"
          value={formatCurrency(kpis.ventasMes)}
          icon={DollarSign}
          change={{ value: Math.abs(ventasChange), positive: ventasChange >= 0 }}
        />
        <MetricCard
          title="Compras del mes"
          value={formatCurrency(kpis.comprasMes)}
          icon={ShoppingCart}
          change={{ value: Math.abs(comprasChange), positive: comprasChange >= 0 }}
        />
        <MetricCard
          title="IVA a pagar"
          value={formatCurrency(Math.max(0, kpis.ivaPagar))}
          icon={Calculator}
          helper={`Próximo vencimiento: ${dayjs().add(10, "days").format("DD MMM")}`}
        />
        <MetricCard
          title="Retenciones registradas"
          value={formatCurrency(kpis.retencionesMes)}
          icon={Receipt}
          change={{ value: Math.abs(retencionesChange), positive: retencionesChange >= 0 }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-5 w-5 text-primary" />
              Flujo mensual de ventas y compras
            </CardTitle>
            <CardDescription>Comportamiento de los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyFlowConfig} className="h-72">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="ventasGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="comprasGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatNumber} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="var(--chart-1)"
                  fill="url(#ventasGradient)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="compras"
                  stroke="var(--chart-2)"
                  fill="url(#comprasGradient)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Layers className="h-5 w-5 text-primary" />
              Distribución de IVA por tasa (año)
            </CardTitle>
            <CardDescription>Comparativo entre ventas y compras</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ivaChartConfig} className="h-72">
              <BarChart data={ivaBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="rate" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatNumber} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="ventas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="compras" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ajustes registrados
            </CardTitle>
            <CardDescription>Retenciones y notas de crédito emitidas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ajustesChartConfig} className="h-72">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatNumber} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="retenciones" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="notasCredito" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Layers className="h-5 w-5 text-primary" />
              Compras por rubro (año)
            </CardTitle>
            <CardDescription>Categorías deducibles con mayor peso</CardDescription>
          </CardHeader>
          <CardContent>
            {rubrosData.length ? (
              <ChartContainer config={rubroChartConfig} className="h-72">
                <BarChart data={rubrosData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis type="number" tickFormatter={formatNumber} hide />
                  <YAxis
                    dataKey="rubro"
                    type="category"
                    width={160}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                    }
                  />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                No se registran compras en las categorías deducibles.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Actividad reciente</CardTitle>
            <CardDescription>Últimas operaciones registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length ? (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{item.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayjs(item.timestamp).fromNow()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-foreground">
                        {formatCurrency(item.amount)}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Aún no registras movimientos.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Impuestos y vencimientos
            </CardTitle>
            <CardDescription>Distribución mensual y próximos hitos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {taxDistribution.length ? (
              <ChartContainer config={{}} className="mx-auto h-56 w-full">
                <PieChart>
                  <Pie
                    data={taxDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {taxDistribution.map((_, index) => (
                      <Cell key={index} fill={taxColors[index % taxColors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent hideIcon />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No hay impuestos registrados este mes.
              </div>
            )}

            <div className="space-y-3">
              {[
                {
                  title: "Declaración IVA",
                  date: dayjs().add(10, "days").format("DD MMM YYYY"),
                  priority: "Alta",
                },
                {
                  title: "Retenciones en la fuente",
                  date: dayjs().add(15, "days").format("DD MMM YYYY"),
                  priority: "Media",
                },
                {
                  title: "Impuesto a la renta",
                  date: dayjs().add(90, "days").format("DD MMM YYYY"),
                  priority: "Baja",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <Badge variant={item.priority === "Alta" ? "destructive" : "outline"}>
                    {item.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
