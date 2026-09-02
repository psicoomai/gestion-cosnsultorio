"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { themeColors } from "@/lib/theme-colors";
import { formatCurrency } from "@/lib/format";
import type { monthlyTotals } from "@/lib/metrics";

// Los colores de la gráfica se importan de theme-colors.ts (fuente única);
// nunca se escriben hex/rgb sueltos aquí.
export function RevenueChart({ data }: { data: ReturnType<typeof monthlyTotals> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={4} margin={{ left: -12, right: 8 }}>
        <CartesianGrid
          vertical={false}
          stroke={themeColors.dark}
          strokeOpacity={0.08}
        />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: themeColors.dark, fillOpacity: 0.55, fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={64}
          tick={{ fill: themeColors.dark, fillOpacity: 0.55, fontSize: 12 }}
          tickFormatter={(value: number) => formatCurrency(value)}
        />
        <Tooltip
          cursor={{ fill: themeColors.dark, fillOpacity: 0.04 }}
          contentStyle={{
            background: themeColors.background,
            border: `1px solid ${themeColors.dark}1A`,
            borderRadius: 8,
            fontSize: 13,
            color: themeColors.dark,
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: themeColors.dark, opacity: 0.7 }}
        />
        <Bar
          dataKey="generado"
          name="Generado"
          fill={themeColors.blueSecondary}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="cobrado"
          name="Cobrado"
          fill={themeColors.blueAccent}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
