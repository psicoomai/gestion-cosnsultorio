const currencyFormatters = {
  MXN: new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
};

// Los totales agregados (Panel, Cobros) suman montos de todos los pacientes
// sin convertir divisas — asume una sola moneda operativa (MXN). Para un
// paciente individual, usa su propia moneda.
export function formatCurrency(amount: number, currency: "MXN" | "USD" = "MXN"): string {
  return currencyFormatters[currency].format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
