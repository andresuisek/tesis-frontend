'use client';

interface LineChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  title?: string;
  height?: number;
  color?: string;
}

export default function LineChart({ data, title, height = 200, color = '#3b82f6' }: LineChartProps) {
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const valueRange = maxValue - minValue;
  const chartPadding = 40;
  const chartWidth = 400;
  const pointRadius = 4;

  const getXPosition = (index: number) => {
    return chartPadding + (index * (chartWidth - chartPadding * 2)) / (data.length - 1);
  };

  const getYPosition = (value: number) => {
    const normalizedValue = valueRange > 0 ? (value - minValue) / valueRange : 0.5;
    return height - (normalizedValue * height) + chartPadding;
  };

  const pathData = data.map((item, index) => {
    const x = getXPosition(index);
    const y = getYPosition(item.value);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

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
            const value = minValue + (valueRange * ratio);
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
                  ${(value / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <path
            d={`${pathData} L ${getXPosition(data.length - 1)} ${height + chartPadding} L ${getXPosition(0)} ${height + chartPadding} Z`}
            fill="url(#areaGradient)"
          />

          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((item, index) => {
            const x = getXPosition(index);
            const y = getYPosition(item.value);
            
            return (
              <g key={index}>
                {/* Point */}
                <circle
                  cx={x}
                  cy={y}
                  r={pointRadius}
                  fill="white"
                  stroke={color}
                  strokeWidth="3"
                  className="transition-all duration-300 hover:r-6"
                />
                
                {/* Value label on hover */}
                <circle
                  cx={x}
                  cy={y}
                  r={pointRadius + 8}
                  fill="transparent"
                  className="cursor-pointer"
                >
                  <title>${Math.round(item.value)} - {item.label}</title>
                </circle>

                {/* X-axis label */}
                <text
                  x={x}
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
