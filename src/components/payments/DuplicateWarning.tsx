import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Currency, Payment } from "@/lib/types";

export function DuplicateWarning({ matches, currency }: { matches: Payment[]; currency: Currency }) {
  if (matches.length === 0) return null;

  return (
    <Alert variant="accent" title="Posible pago duplicado">
      Ya existe {matches.length === 1 ? "un pago registrado muy similar" : "pagos registrados muy similares"}:{" "}
      {matches
        .map(
          (m) =>
            `${formatCurrency(m.amount, currency)} el ${formatDate(m.date)}${
              m.reference ? ` (ref. ${m.reference})` : ""
            }`
        )
        .join("; ")}
      . Revisa antes de continuar — tú decides si registrarlo de todas formas.
    </Alert>
  );
}
