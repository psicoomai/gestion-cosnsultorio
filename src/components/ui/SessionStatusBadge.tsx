import { Badge } from "@/components/ui/Badge";
import type { SessionStatus } from "@/lib/mock-data";

const labels: Record<SessionStatus, string> = {
  pagada: "Pagada",
  parcial: "Pago parcial",
  pendiente: "Pendiente",
};

// Una sesión pagada nunca lleva rojo: el rojo se reserva para lo que
// todavía se adeuda (pendiente); lo parcial usa el acento de atención.
const variants: Record<SessionStatus, "neutral" | "accent" | "debt"> = {
  pagada: "neutral",
  parcial: "accent",
  pendiente: "debt",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
