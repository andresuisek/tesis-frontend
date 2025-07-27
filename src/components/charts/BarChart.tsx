'use client';

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  title?: string;
  height?: number;
}

export default function BarChart({ data, title, height = 200 }: BarChartProps) {
  const maxValue = Math.max(...data.map(item => item.value));
  const chartPadding = 40;
  const barWidth = 40;
  const barSpacing = 60;
  const chartWidth = data.length * barSpacing + chartPadding * 2;

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>}
      <div className="relative">
        <svg 
          width="100%" 
          height={height + 60} 
          viewBox={`0 0 ${chartWidth} ${height + 60}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = height - (ratio * height) + chartPadding;
            return (
              <g key={index}>
                <line
                  x1={chartPadding}
                  y1={y}
                  x2={chartWidth - chartPadding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={chartPadding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6b7280"
                >
                  ${(maxValue * ratio / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * height;
            const x = chartPadding + index * barSpacing + (barSpacing - barWidth) / 2;
            const y = height - barHeight + chartPadding;

            return (
              <g key={index}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={item.color}
                  rx="4"
                  className="transition-all duration-300 hover:opacity-80"
                />
                
                {/* Value label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                  fontWeight="500"
                >
                  ${(item.value / 1000).toFixed(1)}k
                </text>

                {/* X-axis label */}
                <text
                  x={x + barWidth / 2}
                  y={height + chartPadding + 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={chartPadding}
            y1={height + chartPadding}
            x2={chartWidth - chartPadding}
            y2={height + chartPadding}
            stroke="#374151"
            strokeWidth="2"
          />
          <line
            x1={chartPadding}
            y1={chartPadding}
            x2={chartPadding}
            y2={height + chartPadding}
            stroke="#374151"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
