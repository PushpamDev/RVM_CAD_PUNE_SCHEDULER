
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
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

const getStatusColor = (name: string) => COLORS[name as keyof typeof COLORS] || '#E2E8F0'; // default gray-200

export function BatchStatusDonutChart({ data }: BatchStatusDonutChartProps) {
  const totalBatches = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Status Distribution</CardTitle>
        <CardDescription>Breakdown of all batches by their current status.</CardDescription>
      </CardHeader>
      <CardContent>
        {totalBatches === 0 ? (
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <p className="text-lg">No Batch Data</p>
            <p className="text-sm">Cannot display chart.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} // Disable label lines
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} batches`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}