import { Badge } from "@/components/ui/Badge";
import { patientStatusLabels, type PatientStatus } from "@/lib/types";

const variants: Record<PatientStatus, "neutral" | "info" | "accent"> = {
  activo: "info",
  "en-pausa": "accent",
  inactivo: "neutral",
};

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return <Badge variant={variants[status]}>{patientStatusLabels[status]}</Badge>;
}
