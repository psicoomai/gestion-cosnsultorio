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
  // Cobrado (azul) y por cobrar (rojo, reservado a adeudos) apilados: la
  // altura total de cada barra son los honorarios del mes.
  const rows = data.map((d) => ({ ...d, porCobrar: Math.max(0, d.generado - d.cobrado) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ left: -12, right: 8 }} barCategoryGap="28%">
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
          width={56}
          tick={{ fill: themeColors.dark, fillOpacity: 0.55, fontSize: 12 }}
          tickFormatter={(value: number) => (value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`)}
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
          formatter={(value: string) => <span style={{ color: themeColors.dark }}>{value}</span>}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: themeColors.dark, opacity: 0.7 }}
        />
        <Bar
          isAnimationActive={false}
          dataKey="cobrado"
          name="Cobrado"
          stackId="mes"
          fill={themeColors.blueAccent}
          stroke={themeColors.background}
          strokeWidth={2}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          isAnimationActive={false}
          dataKey="porCobrar"
          name="Por cobrar"
          stackId="mes"
          fill={themeColors.debtRed}
          stroke={themeColors.background}
          strokeWidth={2}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
