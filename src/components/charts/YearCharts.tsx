"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/format";
import type { YearInsights } from "@/lib/insights";
import type { YearSummary } from "@/lib/metrics";
import { themeColors } from "@/lib/theme-colors";
import type { Currency } from "@/lib/types";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const axisTick = { fill: themeColors.dark, fillOpacity: 0.6, fontSize: 12 };
const compact = (value: number) => (value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`);
const tooltipStyle = {
  background: themeColors.background,
  border: `1px solid ${themeColors.dark}26`,
  borderRadius: 8,
  fontSize: 13,
  color: themeColors.dark,
};

function percent(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${Math.round(change * 100)}%`;
}

/**
 * Gráficas del corte anual: en qué meses te va mejor y en cuáles está más
 * apretado, con tus vacaciones marcadas y la comparación con el año anterior.
 * Cobrado (azul) y por cobrar (rojo, reservado a adeudos) se apilan; el año
 * anterior va en naranja. La tabla de ingresos mensuales es su vista en tabla.
 */
export function YearCharts({
  summary,
  previous,
  insights,
  vacationDays,
  currency,
}: {
  summary: YearSummary;
  previous: YearSummary | null;
  insights: YearInsights;
  /** Días de vacaciones por mes (12 posiciones). */
  vacationDays: number[];
  currency: Currency;
}) {
  const money = (v: number) => formatCurrency(v, currency);
  const data = summary.months.map((m, i) => ({
    label: MONTHS[i],
    cobrado: Math.round(m.paid * 100) / 100,
    porCobrar: Math.round(m.pending * 100) / 100,
    anterior: previous ? Math.round(previous.months[i].paid * 100) / 100 : 0,
    vacaciones: vacationDays[i],
  }));
  const hasPrevious = Boolean(previous && previous.total.paid > 0);
  const { best, tightest, average, vsPrevious } = insights;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Mejor mes"
          value={best ? MONTHS_LONG[best.month].replace(/^./, (c) => c.toUpperCase()) : "—"}
          hint={best ? `${money(best.paid)} cobrados` : "Aún no hay meses cerrados"}
        />
        <StatCard
          label="Mes más apretado"
          value={tightest ? MONTHS_LONG[tightest.month].replace(/^./, (c) => c.toUpperCase()) : "—"}
          hint={
            tightest
              ? `${money(tightest.paid)} cobrados${vacationDays[tightest.month] > 0 ? ` · ${vacationDays[tightest.month]} días de vacaciones` : ""}`
              : "Se calcula con al menos dos meses cerrados"
          }
        />
        <StatCard
          label="Promedio mensual"
          value={average > 0 ? money(average) : "—"}
          hint={insights.closedMonths.length ? `De ${insights.closedMonths.length} meses cerrados` : undefined}
        />
        <StatCard
          label={`Contra ${summary.year - 1}`}
          value={vsPrevious && vsPrevious.change !== null ? percent(vsPrevious.change) : "—"}
          hint={
            vsPrevious
              ? `${money(vsPrevious.currentPaid)} vs ${money(vsPrevious.previousPaid)} en los mismos meses`
              : `Sin datos de ${summary.year - 1} para comparar`
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cobrado por mes · {summary.year}</CardTitle>
          <p className="text-xs text-dark/55">
            La línea punteada es tu promedio mensual. Las franjas grises son meses con vacaciones.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 16, left: -8, right: 8 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={themeColors.dark} strokeOpacity={0.08} />
              {data.map((d) =>
                d.vacaciones > 0 ? (
                  <ReferenceArea
                    key={`vac-${d.label}`}
                    x1={d.label}
                    x2={d.label}
                    fill={themeColors.dark}
                    fillOpacity={0.06}
                    ifOverflow="extendDomain"
                  />
                ) : null
              )}
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis axisLine={false} tickLine={false} width={52} tick={axisTick} tickFormatter={compact} />
              <Tooltip
                cursor={{ fill: themeColors.dark, fillOpacity: 0.04 }}
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [money(value), name]}
                labelFormatter={(label: string) => {
                  const d = data.find((x) => x.label === label);
                  return d && d.vacaciones > 0 ? `${label} · ${d.vacaciones} días de vacaciones` : label;
                }}
              />
              <Legend
          formatter={(value: string) => <span style={{ color: themeColors.dark }}>{value}</span>} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: themeColors.dark }} />
              {average > 0 ? (
                <ReferenceLine
                  y={average}
                  stroke={themeColors.dark}
                  strokeOpacity={0.45}
                  strokeDasharray="4 4"
                  label={{
                    value: `Promedio ${compact(average)}`,
                    position: "insideTopRight",
                    fill: themeColors.dark,
                    fillOpacity: 0.7,
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Bar
                isAnimationActive={false}
                dataKey="cobrado"
                name="Cobrado"
                stackId="mes"
                fill={themeColors.chart}
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
        </CardContent>
      </Card>

      {hasPrevious ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {summary.year} contra {summary.year - 1}
            </CardTitle>
            <p className="text-xs text-dark/55">Cobrado de cada mes en los dos años.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 8, left: -8, right: 8 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={themeColors.dark} strokeOpacity={0.08} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} width={52} tick={axisTick} tickFormatter={compact} />
                <Tooltip
                  cursor={{ fill: themeColors.dark, fillOpacity: 0.04 }}
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [money(value), name]}
                />
                <Legend
          formatter={(value: string) => <span style={{ color: themeColors.dark }}>{value}</span>} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: themeColors.dark }} />
                <Bar
                  isAnimationActive={false}
                  dataKey="anterior"
                  name={String(summary.year - 1)}
                  fill={themeColors.orangeAccent}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="cobrado"
                  name={String(summary.year)}
                  fill={themeColors.chart}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
