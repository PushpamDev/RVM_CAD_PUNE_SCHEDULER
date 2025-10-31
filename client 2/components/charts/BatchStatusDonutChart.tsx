import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BatchStatusData {
  name: string;
  value: number;
}

interface BatchStatusDonutChartProps {
  data: BatchStatusData[];
}

const COLORS = {
  active: '#22C55E', // green-500
  upcoming: '#3B82F6', // blue-500
  completed: '#6B7280', // gray-500
};

const getStatusColor = (name: string) => COLORS[name as keyof typeof COLORS] || '#E2E8F0';

// **NEW**: A custom shape for the active (hovered) pie segment
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill={fill} className="text-2xl font-bold">
        {payload.value}
      </text>
      <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#9CA3AF" className="text-sm">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6} // Makes the hovered segment pop out
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export function BatchStatusDonutChart({ data }: BatchStatusDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const totalBatches = data.reduce((sum, entry) => sum + entry.value, 0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Status Distribution</CardTitle>
        <CardDescription>Breakdown of all batches by their current status.</CardDescription>
      </CardHeader>
      <CardContent>
        {totalBatches === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <p className="text-lg">No Batch Data</p>
            <p className="text-sm">Cannot display chart.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Chart Area */}
            <div className="relative h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex ?? -1}
                    activeShape={renderActiveShape}
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} className="focus:outline-none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* **NEW**: Text in the center of the donut */}
              {activeIndex === null && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-3xl font-bold">{totalBatches}</span>
                  <p className="text-muted-foreground text-sm">Total Batches</p>
                </div>
              )}
            </div>
            {/* **NEW**: Custom Legend */}
            <div className="flex flex-col justify-center space-y-3">
              {data.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getStatusColor(entry.name) }}
                    />
                    <span className="capitalize">{entry.name}</span>
                  </div>
                  <div className="font-medium text-right">
                    <span>{entry.value}</span>
                    <span className="text-muted-foreground ml-2">
                      ({((entry.value / totalBatches) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}