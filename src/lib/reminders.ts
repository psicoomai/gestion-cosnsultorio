// Recordatorios de pago por WhatsApp. Se arma el mensaje con las sesiones
// pendientes y se abre WhatsApp con el texto listo: la persona lo revisa y lo
// envía ella misma (nunca se manda nada automáticamente).

import { formatCurrency, formatDate } from "@/lib/format";
import { allocatePayments, roundCents } from "@/lib/metrics";
import type { Patient, Payment, Profile, Session } from "@/lib/types";

export const DEFAULT_REMINDER_TEMPLATE = `Hola {nombre}, ¿cómo estás? Te comparto tu saldo pendiente de {monto} por {sesiones}:
{detalle}

{datos_pago}

¡Gracias! {firma}`;

export const REMINDER_PLACEHOLDERS: [string, string][] = [
  ["{nombre}", "nombre del paciente (solo el primer nombre)"],
  ["{monto}", "total pendiente"],
  ["{sesiones}", "número de sesiones, p. ej. “3 sesiones”"],
  ["{detalle}", "una línea por sesión con su fecha y lo que falta"],
  ["{datos_pago}", "tus datos para pago (de Ajustes)"],
  ["{firma}", "tu nombre"],
];

export interface PendingSession {
  session: Session;
  pending: number;
}

/** Sesiones del paciente con saldo pendiente, de la más antigua a la más reciente. */
export function pendingSessions(patientId: string, sessions: Session[], payments: Payment[]): PendingSession[] {
  const own = sessions.filter((s) => s.patientId === patientId);
  const { sessionPaid } = allocatePayments(own, payments.filter((p) => p.patientId === patientId));
  return own
    .map((session) => ({ session, pending: roundCents(session.amount - Math.min(sessionPaid.get(session.id) ?? 0, session.amount)) }))
    .filter((p) => p.pending > 0.009)
    .sort((a, b) => a.session.date.localeCompare(b.session.date));
}

export function buildReminderMessage(patient: Patient, pending: PendingSession[], profile: Profile | null): string {
  const total = roundCents(pending.reduce((s, p) => s + p.pending, 0));
  const detail = pending
    .map((p) => {
      const partial = p.pending < p.session.amount ? ` (faltan ${formatCurrency(p.pending, patient.currency)})` : "";
      return `• ${formatDate(p.session.date)}: ${formatCurrency(p.session.amount, patient.currency)}${partial}`;
    })
    .join("\n");
  const values: Record<string, string> = {
    "{nombre}": patient.name.trim().split(/\s+/)[0] ?? patient.name,
    "{monto}": formatCurrency(total, patient.currency),
    "{sesiones}": `${pending.length} ${pending.length === 1 ? "sesión" : "sesiones"}`,
    "{detalle}": detail,
    "{datos_pago}": profile?.paymentDetails?.trim() ?? "",
    "{firma}": profile?.name ?? "",
  };
  let text = profile?.reminderTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE;
  for (const [key, value] of Object.entries(values)) text = text.split(key).join(value);
  // Sin datos de pago no deben quedar renglones vacíos de más.
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Teléfono para WhatsApp en formato internacional sin "+". Un número de 10
 * dígitos se toma como mexicano (+52). `null` si no hay número usable.
 */
export function whatsappNumber(phone: string | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** Enlace que abre WhatsApp con el mensaje escrito; sin número, WhatsApp pide elegir el contacto. */
export function whatsappUrl(phone: string | undefined, message: string): string {
  const number = whatsappNumber(phone);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(message)}`;
}
