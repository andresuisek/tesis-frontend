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
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calculator,
  ChartBar,
  AlertCircle,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

// Datos para las gráficas
const salesData = [
  { month: "Ene", sales: 35000, purchases: 15000, profit: 20000 },
  { month: "Feb", sales: 42000, purchases: 18000, profit: 24000 },
  { month: "Mar", sales: 38000, purchases: 16000, profit: 22000 },
  { month: "Abr", sales: 45000, purchases: 20000, profit: 25000 },
  { month: "May", sales: 52000, purchases: 22000, profit: 30000 },
  { month: "Jun", sales: 48000, purchases: 19000, profit: 29000 },
];

const taxData = [
  { name: "IVA Pagado", value: 3967, fill: "#1D4ED8" },
  { name: "Retenciones", value: 1234, fill: "#14B8A6" },
  { name: "Impuesto Renta", value: 2500, fill: "#0A192F" },
  { name: "Otros", value: 800, fill: "#6B7280" },
];

const monthlyTrend = [
  { month: "Jul", amount: 32000 },
  { month: "Ago", amount: 38000 },
  { month: "Sep", amount: 42000 },
  { month: "Oct", amount: 39000 },
  { month: "Nov", amount: 46000 },
  { month: "Dic", amount: 45231 },
];

const chartConfig = {
  sales: {
    label: "Ventas",
    color: "#1D4ED8",
  },
  purchases: {
    label: "Compras",
    color: "#14B8A6",
  },
  profit: {
    label: "Utilidad",
    color: "#0A192F",
  },
  amount: {
    label: "Monto",
    color: "#1D4ED8",
  },
};

export default function DashboardPage() {
  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 min-h-screen p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[#0A192F] to-[#1D4ED8] bg-clip-text text-transparent">
            Dashboard Tributario
          </h1>
          <p className="text-muted-foreground mt-2">
            Resumen general de tu actividad tributaria y métricas clave
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="border-[#14B8A6] text-[#14B8A6]">
            Último: Diciembre 2024
          </Badge>
          <Button className="bg-gradient-to-r from-[#1D4ED8] to-[#14B8A6] hover:from-[#1E40AF] hover:to-[#0F766E] text-white shadow-lg">
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#1D4ED8] shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0A192F] dark:text-white">
              Ventas del Mes
            </CardTitle>
            <div className="p-2 bg-[#1D4ED8]/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-[#1D4ED8]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0A192F] dark:text-white">
              $45,231.89
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-[#14B8A6] flex items-center gap-1 font-medium">
                <TrendingUp className="h-3 w-3" />
                +20.1%
              </span>
              desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#14B8A6] shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0A192F] dark:text-white">
              Compras del Mes
            </CardTitle>
            <div className="p-2 bg-[#14B8A6]/10 rounded-lg">
              <FileText className="h-5 w-5 text-[#14B8A6]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0A192F] dark:text-white">
              $12,234.56
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-red-500 flex items-center gap-1 font-medium">
                <TrendingDown className="h-3 w-3" />
                -4.3%
              </span>
              desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0A192F] dark:text-white">
              IVA a Pagar
            </CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Calculator className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0A192F] dark:text-white">
              $3,967.22
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-orange-600 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3" />
                Vence: 12 Ene 2025
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#0A192F] shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0A192F] dark:text-white">
              Retenciones
            </CardTitle>
            <div className="p-2 bg-[#0A192F]/10 rounded-lg">
              <ChartBar className="h-5 w-5 text-[#0A192F]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0A192F] dark:text-white">
              $1,234.56
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-[#14B8A6] flex items-center gap-1 font-medium">
                <TrendingUp className="h-3 w-3" />
                +12.5%
              </span>
              desde el mes pasado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Gráficas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfica de Ventas vs Compras */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#0A192F] dark:text-white">
              <BarChart3 className="h-5 w-5 text-[#1D4ED8]" />
              Análisis Financiero Mensual
            </CardTitle>
            <CardDescription>
              Comparativa de ventas, compras y utilidades por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="sales" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#0A192F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfica de Distribución de Impuestos */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#0A192F] dark:text-white">
              <PieChart className="h-5 w-5 text-[#14B8A6]" />
              Distribución de Impuestos
            </CardTitle>
            <CardDescription>
              Desglose de obligaciones tributarias actuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <RechartsPieChart>
                <Pie
                  data={taxData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) =>
                    `${name}: $${value.toLocaleString()}`
                  }
                >
                  {taxData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica de Tendencia Mensual */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#0A192F] dark:text-white">
            <TrendingUp className="h-5 w-5 text-[#14B8A6]" />
            Tendencia de Ingresos
          </CardTitle>
          <CardDescription>
            Evolución de los ingresos en los últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#1D4ED8"
                fill="url(#colorGradient)"
                strokeWidth={3}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Secciones adicionales mejoradas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-lg border-t-4 border-t-[#1D4ED8]">
          <CardHeader>
            <CardTitle className="text-[#0A192F] dark:text-white">
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas transacciones registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  type: "Venta",
                  amount: "$2,345.67",
                  date: "Hace 2 horas",
                  status: "Completado",
                  color: "#1D4ED8",
                },
                {
                  type: "Compra",
                  amount: "$890.12",
                  date: "Hace 4 horas",
                  status: "Pendiente",
                  color: "#14B8A6",
                },
                {
                  type: "Retención",
                  amount: "$156.78",
                  date: "Ayer",
                  status: "Completado",
                  color: "#0A192F",
                },
                {
                  type: "Venta",
                  amount: "$1,234.56",
                  date: "Ayer",
                  status: "Completado",
                  color: "#1D4ED8",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#0A192F] dark:text-white">
                        {item.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#0A192F] dark:text-white">
                      {item.amount}
                    </p>
                    <Badge
                      variant={
                        item.status === "Completado" ? "default" : "secondary"
                      }
                      className={
                        item.status === "Completado"
                          ? "bg-[#14B8A6] hover:bg-[#0F766E]"
                          : ""
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-lg border-t-4 border-t-orange-500">
          <CardHeader>
            <CardTitle className="text-[#0A192F] dark:text-white">
              Próximos Vencimientos
            </CardTitle>
            <CardDescription>
              Obligaciones tributarias próximas a vencer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  obligation: "Declaración IVA",
                  date: "12 Ene 2025",
                  priority: "Alta",
                },
                {
                  obligation: "Retenciones en la Fuente",
                  date: "15 Ene 2025",
                  priority: "Media",
                },
                {
                  obligation: "Impuesto a la Renta",
                  date: "31 Mar 2025",
                  priority: "Baja",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[#0A192F] dark:text-white">
                      {item.obligation}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <Badge
                    variant={
                      item.priority === "Alta"
                        ? "destructive"
                        : item.priority === "Media"
                        ? "default"
                        : "secondary"
                    }
                    className={
                      item.priority === "Media"
                        ? "bg-[#1D4ED8] hover:bg-[#1E40AF]"
                        : ""
                    }
                  >
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
