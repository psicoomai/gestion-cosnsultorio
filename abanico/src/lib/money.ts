const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** 4550 → "$45.50" */
export function formatMoney(cents: number): string {
  return mxn.format(cents / 100);
}
