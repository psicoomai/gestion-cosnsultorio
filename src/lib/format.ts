const currencyFormatters = {
  MXN: new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
};

// Los totales agregados (Panel, Cobros) suman montos de todos los pacientes
// sin convertir divisas — asume una sola moneda operativa (MXN). Para un
// paciente individual, usa su propia moneda. Se muestran centavos solo
// cuando existen (p. ej. depósitos de plataformas con comisión).
export function formatCurrency(amount: number, currency: "MXN" | "USD" = "MXN"): string {
  const rounded = Math.round(amount * 100) / 100;
  return currencyFormatters[currency].format(Object.is(rounded, -0) ? 0 : rounded);
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * "2026-07-14" se interpreta como fecha LOCAL. `new Date("2026-07-14")` la
 * leería como medianoche UTC y en México se mostraría como el 13 de julio.
 */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDate(iso: string): string {
  return dateFormatter.format(parseLocalDate(iso));
}

/** Fecha de hoy (hora local) en formato yyyy-mm-dd. */
export function todayIso(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
