// Convierte la vista previa de importación en pacientes, sesiones y pagos
// de la app. Cada fila con monto pagado genera un pago ligado a su sesión,
// así que Cobrado y Por cobrar quedan idénticos a la suma de las columnas
// Pagado y Pendiente del Excel.

import type { DraftPatient } from "@/lib/import/excel-format";
import { todayIso } from "@/lib/format";
import { generateId } from "@/lib/id";
import type { ClinicData } from "@/lib/storage";
import type { Patient, Payment, Session } from "@/lib/types";

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface ImportResult {
  data: ClinicData;
  createdPatients: number;
  createdSessions: number;
  skippedExisting: number;
}

export interface ImportOptions {
  /** Aplica las correcciones de año sugeridas en la vista previa. */
  fixDates: boolean;
}

/**
 * Agrega lo importado a `existing`. Si ya hay un paciente con el mismo
 * nombre, sus sesiones se suman a ese paciente y se omiten las que ya
 * existen (misma fecha y mismo monto): así se puede volver a importar el
 * mismo Excel actualizado sin duplicar nada.
 */
export function applyImport(
  drafts: DraftPatient[],
  existing: ClinicData,
  options: ImportOptions = { fixDates: true },
  now = new Date()
): ImportResult {
  const patients = [...existing.patients];
  const sessions = [...existing.sessions];
  const payments = [...existing.payments];
  const byName = new Map(patients.map((p) => [normalizeName(p.name), p]));
  let createdPatients = 0;
  let createdSessions = 0;
  let skippedExisting = 0;
  const createdAt = now.toISOString();

  for (const draft of drafts) {
    let patient = byName.get(normalizeName(draft.name));
    if (!patient) {
      const firstDate = draft.sessions
        .map((s) => (options.fixDates && s.fixedDate) || s.date)
        .sort()[0];
      patient = {
        id: generateId("p"),
        name: draft.name,
        startDate: firstDate ?? todayIso(now),
        status: "activo",
        sessionFrequency: draft.kind === "plataforma" ? "variable" : "semanal-1",
        paymentModality: draft.kind === "plataforma"
          ? /spring/i.test(draft.name) ? "spring-health" : "mensual"
          : "por-sesion",
        costPerSession: draft.costPerSession,
        currency: "MXN",
        adminNotes:
          draft.kind === "plataforma"
            ? "Importado de una hoja de plataforma: cada registro es un depósito del mes al que corresponde."
            : undefined,
      } satisfies Patient;
      patients.push(patient);
      byName.set(normalizeName(patient.name), patient);
      createdPatients++;
    }

    // Cuántas sesiones con la misma fecha y monto existían ANTES de importar.
    // Cada fila del Excel "consume" una; las que sobran se crean. Así dos
    // sesiones legítimas el mismo día no se pierden, y reimportar no duplica.
    const existingCount = new Map<string, number>();
    for (const s of sessions) {
      if (s.patientId !== patient.id) continue;
      const key = `${s.date}|${s.amount}`;
      existingCount.set(key, (existingCount.get(key) ?? 0) + 1);
    }

    // Filas pagadas en la misma fecha de pago (escrita en el Excel) forman UN
    // pago que cubre varias sesiones, como ocurre en la realidad. Las filas sin
    // fecha de pago generan un pago por sesión, fechado el día de la sesión.
    const grouped = new Map<string, { date: string; amount: number; sessionIds: string[]; notes: Set<string> }>();

    for (const draftSession of draft.sessions) {
      const date = (options.fixDates && draftSession.fixedDate) || draftSession.date;
      const paymentDate = (options.fixDates && draftSession.fixedPaymentDate) || draftSession.paymentDate;
      const key = `${date}|${draftSession.amount}`;
      const remaining = existingCount.get(key) ?? 0;
      if (remaining > 0) {
        existingCount.set(key, remaining - 1);
        skippedExisting++;
        continue;
      }
      const session: Session = {
        id: generateId("s"),
        patientId: patient.id,
        date,
        amount: draftSession.amount,
        note: draftSession.note,
        attendance: draftSession.noShow ? "falto" : undefined,
      };
      sessions.push(session);
      createdSessions++;
      if (draftSession.paid <= 0) continue;

      const groupKey = draftSession.paymentDateExplicit ? `pago|${paymentDate}` : `sesion|${session.id}`;
      const group = grouped.get(groupKey) ?? { date: paymentDate, amount: 0, sessionIds: [], notes: new Set() };
      group.amount = Math.round((group.amount + draftSession.paid) * 100) / 100;
      group.sessionIds.push(session.id);
      if (draftSession.note) group.notes.add(draftSession.note);
      grouped.set(groupKey, group);
    }

    for (const group of grouped.values()) {
      const payment: Payment = {
        id: generateId("pay"),
        patientId: patient.id,
        amount: group.amount,
        date: group.date,
        sessionIds: group.sessionIds,
        source: "importado",
        concept: [...group.notes].join(" · ") || undefined,
        createdAt,
      };
      payments.push(payment);
    }
  }

  return { data: { patients, sessions, payments }, createdPatients, createdSessions, skippedExisting };
}
