'use client';

interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  title?: string;
  size?: number;
}

export default function PieChart({ data, title, size = 200 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  let cumulativePercentage = 0;

  const createArcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", centerX, centerY,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>}
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const startAngle = cumulativePercentage * 3.6;
              const endAngle = (cumulativePercentage + percentage) * 3.6;
              
              cumulativePercentage += percentage;

              return (
                <path
                  key={index}
                  d={createArcPath(startAngle, endAngle)}
                  fill={item.color}
                  className="transition-all duration-300 hover:opacity-80"
                />
              );
            })}
            
            {/* Center circle for donut effect */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.6}
              fill="white"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">${(total / 1000).toFixed(0)}k</span>
            <span className="text-xs text-gray-500">Total</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-700">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="font-medium text-gray-900">${(item.value / 1000).toFixed(1)}k</span>
                <span className="text-gray-500 ml-1">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
