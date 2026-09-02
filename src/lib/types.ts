// Modelo de datos. Ver DESIGN_SYSTEM.md y los puntos 1-3, 6 y 10 de las
// indicaciones del producto: frecuencia de sesiones y modalidad de pago son
// conceptos independientes, el costo es siempre POR SESIÓN, cada sesión
// conserva su propio costo histórico, y los totales se calculan siempre a
// partir de las sesiones y pagos reales (ver src/lib/metrics.ts) — nunca se
// guardan como campos sueltos en el paciente.

/** Cada cuánto suele tener sesiones el paciente. No dispara nada automático. */
export type SessionFrequency =
  | "semanal-1"
  | "semanal-2"
  | "semanal-3"
  | "quincenal"
  | "mensual"
  | "variable";

export const sessionFrequencyLabels: Record<SessionFrequency, string> = {
  "semanal-1": "1 vez por semana",
  "semanal-2": "2 veces por semana",
  "semanal-3": "3 veces por semana",
  quincenal: "Quincenal",
  mensual: "Mensual",
  variable: "Variable / sin frecuencia fija",
};

/** Cómo o con qué periodicidad acostumbra pagar el paciente. Independiente de la frecuencia. */
export type PaymentModality = "semanal" | "por-sesion" | "quincenal" | "mensual" | "spring-health";

export const paymentModalityLabels: Record<PaymentModality, string> = {
  semanal: "Semanal",
  "por-sesion": "Por sesión",
  quincenal: "Quincenal",
  mensual: "Mensual",
  "spring-health": "Spring Health",
};

export type PatientStatus = "activo" | "en-pausa" | "inactivo";

export const patientStatusLabels: Record<PatientStatus, string> = {
  activo: "Activo",
  "en-pausa": "En pausa",
  inactivo: "Inactivo",
};

export type Currency = "MXN" | "USD";

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  /** Fecha de inicio de tratamiento. */
  startDate: string; // ISO
  status: PatientStatus;
  sessionFrequency: SessionFrequency;
  paymentModality: PaymentModality;
  /** Tarifa vigente. Solo aplica a sesiones nuevas — nunca reescribe sesiones pasadas. */
  costPerSession: number;
  currency: Currency;
  adminNotes?: string;
}

export interface Session {
  id: string;
  patientId: string;
  date: string; // ISO
  /** Costo histórico de ESTA sesión. No cambia si después cambia la tarifa del paciente. */
  amount: number;
}

export type SessionStatus = "pagada" | "parcial" | "pendiente";

export type PaymentMethod = "Transferencia" | "Efectivo" | "Tarjeta" | "Otro";

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  date: string; // ISO, fecha de pago
  reference?: string;
  method?: PaymentMethod;
  /** Sesiones a las que se aplica este pago, en el orden en que se abonan. */
  sessionIds: string[];
  source: "manual" | "comprobante";
  createdAt: string; // ISO
}
