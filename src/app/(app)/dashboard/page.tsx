"use client";

import { useMemo } from "react";
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
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,

  Receipt,
  AlertCircle,
  BarChart3,
  Layers,
  TrendingUp,
  CalendarClock,
  FileText,
  ArrowRight,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { TaxPeriodFilter } from "@/components/filters/tax-period-filter";
import { useAvailableYears } from "@/hooks/use-available-years";
import { useDateFilter } from "@/contexts/date-filter-context";
import { useAuth } from "@/contexts/auth-context";
import { SkeletonStatCard, SkeletonChartCard } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getNextDeadline,
  getDeadlineStatus,
  type UrgencyLevel,
} from "@/lib/tax-deadlines";

dayjs.extend(relativeTime);
dayjs.locale("es");

const monthlyFlowConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  compras: { label: "Compras", color: "var(--chart-2)" },
};

const heroChartConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  compras: { label: "Compras", color: "var(--chart-2)" },
  utilidad: { label: "Utilidad", color: "var(--chart-3)" },
};

const ivaChartConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  compras: { label: "Compras", color: "var(--chart-2)" },
};

const ajustesChartConfig = {
  retenciones: { label: "Retenciones", color: "var(--chart-4)" },
  notasCredito: { label: "Notas de crédito", color: "var(--chart-5)" },
};

const rubroChartConfig = {
  total: { label: "Total", color: "var(--chart-1)" },
};

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

const formatCurrencyShort = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

const urgencyColors: Record<UrgencyLevel, string> = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  ok: "bg-primary/10 text-primary",
  done: "bg-green-500/15 text-green-700 dark:text-green-400",
};

const urgencyLabels: Record<UrgencyLevel, string> = {
  critical: "Vencido",
  warning: "Por vencer",
  ok: "Al día",
  done: "Cumplido",
};

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
    rubroDistribution,
    ivaBreakdown,
    recentActivity,
    taxStatus,
    loading,
    error,
  } = useDashboardData();
  const { year: selectedYear, month: selectedMonth } = useDateFilter();
  const { years: availableYears } = useAvailableYears("ventas");
  const { contribuyenteEfectivo: contribuyente } = useAuth();

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

  // Compute real tax deadline using the RUC
  const ruc = contribuyente?.ruc ?? "";
  const deadlineInfo = useMemo(() => {
    if (!ruc) return null;
    return getNextDeadline(ruc, "mensual");
  }, [ruc]);

  const deadlineStatus = useMemo(() => {
    if (!deadlineInfo) return null;
    return getDeadlineStatus(
      deadlineInfo.daysUntilDeadline,
      taxStatus.hasCurrentLiquidation,
      taxStatus.hasTransactions,
    );
  }, [deadlineInfo, taxStatus.hasCurrentLiquidation, taxStatus.hasTransactions]);

  // Hero chart totals (from monthly data — always 12 months)
  const heroTotals = useMemo(() => {
    const ventas = monthlyData.reduce((s, d) => s + d.ventas, 0);
    const compras = monthlyData.reduce((s, d) => s + d.compras, 0);
    const utilidad = ventas - compras;
    return { ventas, compras, utilidad };
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        {/* Hero chart skeleton */}
        <SkeletonChartCard />
        <div className="grid gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4"><SkeletonChartCard /></div>
          <div className="lg:col-span-3"><SkeletonChartCard /></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4"><SkeletonChartCard /></div>
          <div className="lg:col-span-3"><SkeletonChartCard /></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4"><SkeletonChartCard /></div>
          <div className="lg:col-span-3"><SkeletonChartCard /></div>
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
          title="Utilidad neta"
          value={formatCurrency(kpis.ventasMes - kpis.comprasMes)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Retenciones registradas"
          value={formatCurrency(kpis.retencionesMes)}
          icon={Receipt}
          change={{ value: Math.abs(retencionesChange), positive: retencionesChange >= 0 }}
        />
      </div>

      {/* ─── Hero Chart: Ventas vs Compras mensual (combo) ─── */}
      <Card>
        <CardHeader className="flex flex-col items-stretch border-b sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-2 py-4 sm:py-0">
            <CardTitle className="text-base font-semibold">
              Ventas vs Compras
            </CardTitle>
            <CardDescription>
              Resumen mensual &middot; últimos 12 meses
            </CardDescription>
          </div>
          <div className="flex">
            {(["ventas", "compras", "utilidad"] as const).map((key) => (
              <div
                key={key}
                className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              >
                <span className="text-xs text-muted-foreground">
                  {key === "ventas" ? "Ventas" : key === "compras" ? "Compras" : "Utilidad"}
                </span>
                <span className={`text-lg font-bold leading-none sm:text-2xl ${
                  key === "utilidad" && heroTotals.utilidad < 0 ? "text-destructive" : ""
                }`}>
                  {formatCurrency(heroTotals[key])}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {monthlyData.length ? (
            <ChartContainer config={heroChartConfig} className="aspect-auto h-72 w-full">
              <ComposedChart data={monthlyData}>
                <CartesianGrid vertical={false} className="stroke-border/60" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrencyShort}
                  width={60}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[200px]"
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                <Bar
                  dataKey="ventas"
                  fill="var(--color-ventas)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="compras"
                  fill="var(--color-compras)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line
                  type="monotone"
                  dataKey="utilidad"
                  stroke="var(--color-utilidad)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--color-utilidad)" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ChartContainer>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              No hay datos mensuales para este periodo.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Row 1: Flujo mensual + IVA por tasa ─── */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-5 w-5 text-primary" />
              Flujo mensual de ventas y compras
            </CardTitle>
            <CardDescription>Comportamiento de los últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyFlowConfig} className="aspect-auto h-72 w-full">
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
                <Bar dataKey="compras" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ─── Row 2: Ajustes + Compras por rubro ─── */}
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

      {/* ─── Row 3: Actividad reciente mejorada + Estado tributario ─── */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Actividad reciente</CardTitle>
            <CardDescription>Últimas operaciones registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length ? (
              <div className="space-y-3">
                {recentActivity.map((item) => {
                  const isVenta = item.type === "Venta";
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isVenta
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {isVenta ? (
                          <DollarSign className="h-4 w-4" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.counterpartyName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.type} &middot; {dayjs(item.timestamp).fromNow()}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-mono font-semibold ${
                          isVenta ? "text-green-600 dark:text-green-400" : "text-foreground"
                        }`}
                      >
                        {isVenta ? "+" : "-"}{formatCurrency(item.amount)}
                      </p>
                    </div>
                  );
                })}
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
              <CalendarClock className="h-5 w-5 text-primary" />
              Estado tributario
            </CardTitle>
            <CardDescription>Declaración IVA mensual y resumen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Próximo vencimiento SRI */}
            {deadlineInfo && deadlineStatus ? (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Próximo vencimiento</p>
                  <Badge className={urgencyColors[deadlineStatus.urgencyLevel]}>
                    {urgencyLabels[deadlineStatus.urgencyLevel]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Periodo: {deadlineInfo.declarationPeriodLabel}
                  </p>
                  <p className="text-lg font-semibold tracking-tight">
                    {deadlineInfo.nextDeadlineDate.format("DD [de] MMMM, YYYY")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {deadlineInfo.daysUntilDeadline > 0
                      ? `Faltan ${deadlineInfo.daysUntilDeadline} días`
                      : deadlineInfo.daysUntilDeadline === 0
                        ? "Vence hoy"
                        : `Venció hace ${Math.abs(deadlineInfo.daysUntilDeadline)} días`}
                    {" "}&middot; 9no dígito: {deadlineInfo.novenoDigito}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Selecciona un contribuyente para ver vencimientos.
              </div>
            )}

            {/* Balance IVA */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Balance IVA del periodo</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">IVA Cobrado (ventas)</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(kpis.ivaVentas)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    <span>IVA Pagado (compras)</span>
                  </div>
                  <span className="font-mono font-medium text-muted-foreground">
                    {formatCurrency(kpis.ivaCompras)}
                  </span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">IVA a Pagar</span>
                  <span className="font-mono font-semibold text-primary">
                    {formatCurrency(Math.max(0, kpis.ivaPagar))}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen de documentos */}
            <div className="rounded-lg border border-border/40 p-3 flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {taxStatus.documentCounts.ventas} ventas &middot;{" "}
                {taxStatus.documentCounts.compras} compras &middot;{" "}
                {taxStatus.documentCounts.retenciones} retenciones
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
