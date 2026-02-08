"use client";

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AgentChartConfig } from "@/contexts/ai-agent-context";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function buildChartConfig(config: AgentChartConfig): ChartConfig {
  const chartConfig: ChartConfig = {};

  config.yKeys.forEach((key, index) => {
    chartConfig[key] = {
      label: key.replace(/_/g, " "),
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  return chartConfig;
}

function AgentBarChart({ config }: { config: AgentChartConfig }) {
  const chartConfig = buildChartConfig(config);

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <BarChart data={config.data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={config.xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) =>
            typeof value === "string" && value.length > 12
              ? value.slice(0, 12) + "..."
              : String(value)
          }
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {config.yKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

function AgentLineChart({ config }: { config: AgentChartConfig }) {
  const chartConfig = buildChartConfig(config);

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <LineChart data={config.data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={config.xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {config.yKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function AgentPieChart({ config }: { config: AgentChartConfig }) {
  const chartConfig = buildChartConfig(config);
  const yKey = config.yKeys[0];

  // Transform data for pie chart: need name + value
  const pieData = config.data.map((row) => ({
    name: String(row[config.xKey] ?? ""),
    value: Number(row[yKey] ?? 0),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <PieChart accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }) =>
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {pieData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function AgentChart({ config }: { config: AgentChartConfig }) {
  if (!config.data?.length || !config.yKeys?.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {config.title}
      </p>
      {config.type === "bar" && <AgentBarChart config={config} />}
      {config.type === "line" && <AgentLineChart config={config} />}
      {config.type === "pie" && <AgentPieChart config={config} />}
    </div>
  );
}
