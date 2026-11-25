import { isCurrentlyActive } from "@/lib/treatment";
import type { Patient } from "@/lib/types";

/** Opciones de un <select> de pacientes: primero los activos y aparte quienes ya no vienen. */
export function PatientOptions({ patients }: { patients: Patient[] }) {
  const sorted = [...patients].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const active = sorted.filter(isCurrentlyActive);
  const inactive = sorted.filter((p) => !isCurrentlyActive(p));
  return (
    <>
      {active.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
      {inactive.length > 0 ? (
        <optgroup label="Ya no vienen">
          {inactive.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  );
}
