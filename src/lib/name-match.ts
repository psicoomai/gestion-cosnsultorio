import type { Patient } from "@/lib/types";

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();
}

/**
 * Sugiere pacientes cuyo nombre coincide parcialmente con un texto libre
 * (p. ej. "este pago es de Majo"). Es una coincidencia de texto simple, no
 * identificación automática — el resultado siempre se presenta como
 * sugerencia para que la persona confirme, nunca se aplica solo.
 */
export function matchPatientsByText(query: string, patients: Patient[]): Patient[] {
  const q = normalize(query);
  if (!q) return [];
  const queryTokens = q.split(/\s+/).filter(Boolean);

  return patients
    .map((patient) => {
      const nameTokens = normalize(patient.name).split(/\s+/);
      const score = queryTokens.filter((qt) =>
        nameTokens.some((nt) => nt.startsWith(qt) || qt.startsWith(nt))
      ).length;
      return { patient, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.patient);
}
