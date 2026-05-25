"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function SparkChart({ data }: { data: number[] }) {
  const chartData = data.map((v, i) => ({ day: i, count: v }));
  return (
    <div style={{ height: 48, marginTop: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
