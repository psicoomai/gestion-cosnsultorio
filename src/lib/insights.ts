// Lecturas del año para las gráficas: qué mes fue el mejor, cuál el más
// apretado, el promedio mensual y la comparación con el año anterior. Solo se
// comparan meses CERRADOS: el mes en curso todavía no termina y los meses
// futuros no cuentan como "apretados".

import { roundCents, type YearSummary } from "@/lib/metrics";

export interface MonthPoint {
  month: number; // enero = 0
  paid: number;
}

export interface YearInsights {
  /** Meses que entran en la comparación (con datos y ya terminados). */
  closedMonths: number[];
  best?: MonthPoint;
  tightest?: MonthPoint;
  average: number;
  /** Comparación con el año anterior en los mismos meses cerrados. */
  vsPrevious?: { previousPaid: number; currentPaid: number; change: number | null };
}

export function closedMonths(summary: YearSummary, today: Date = new Date()): number[] {
  const withData = summary.months.map((m, i) => (m.generated > 0 ? i : -1)).filter((i) => i >= 0);
  if (withData.length === 0) return [];
  const first = withData[0];
  let last = withData[withData.length - 1];
  const currentYear = today.getFullYear();
  if (summary.year > currentYear) return [];
  if (summary.year === currentYear) {
    const lastClosed = today.getMonth() - 1;
    // Si todavía no termina ningún mes con datos, se usa el mes en curso.
    last = lastClosed >= first ? Math.min(last, lastClosed) : Math.min(last, today.getMonth());
  }
  const months: number[] = [];
  for (let m = first; m <= last; m++) months.push(m);
  return months;
}

export function yearInsights(
  summary: YearSummary,
  previous: YearSummary | null,
  today: Date = new Date()
): YearInsights {
  const months = closedMonths(summary, today);
  const points = months.map((month) => ({ month, paid: roundCents(summary.months[month].paid) }));
  const average = points.length ? roundCents(points.reduce((s, p) => s + p.paid, 0) / points.length) : 0;
  const best = points.length ? points.reduce((a, b) => (b.paid > a.paid ? b : a)) : undefined;
  const tightest =
    points.length >= 2 ? points.reduce((a, b) => (b.paid < a.paid ? b : a)) : undefined;

  let vsPrevious: YearInsights["vsPrevious"];
  if (previous && previous.total.generated > 0 && months.length > 0) {
    const previousPaid = roundCents(months.reduce((s, m) => s + previous.months[m].paid, 0));
    const currentPaid = roundCents(months.reduce((s, m) => s + summary.months[m].paid, 0));
    vsPrevious = {
      previousPaid,
      currentPaid,
      change: previousPaid > 0 ? (currentPaid - previousPaid) / previousPaid : null,
    };
  }

  return {
    closedMonths: months,
    best,
    tightest: tightest && best && tightest.month !== best.month ? tightest : undefined,
    average,
    vsPrevious,
  };
}
