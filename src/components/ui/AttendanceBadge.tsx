import { Badge } from "@/components/ui/Badge";
import { attendanceOf } from "@/lib/attendance";
import type { Session } from "@/lib/types";

/** Solo se muestra cuando la sesión no fue normal (faltó o canceló). */
export function AttendanceBadge({ session }: { session: Session }) {
  const a = attendanceOf(session);
  if (a === "asistio") return null;
  const label = a === "falto" ? "Faltó" : a === "cancelo-tarde" ? "Canceló tarde" : "Canceló";
  return (
    <Badge variant={a === "cancelo" ? "neutral" : "accent"} className="ml-2">
      {label}
    </Badge>
  );
}
