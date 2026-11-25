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
  inactivo: "Ya no viene",
};

/** Un periodo de tratamiento ya terminado (dejó de venir y, quizá, regresó después). */
export interface TreatmentPeriod {
  start: string; // ISO
  end: string; // ISO
}

/** Día y hora fijos de la semana en que el paciente suele tener sesión. */
export interface WeeklySlot {
  /** 0 = domingo … 6 = sábado (como `Date.getDay()`). */
  weekday: number;
  /** "HH:mm" */
  time: string;
}

export const weekdayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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
  /**
   * Fecha en que dejó de venir a terapia. Desde el mes siguiente ya no
   * aparece en los cortes mensuales (sus adeudos viejos sí siguen contando).
   */
  endDate?: string; // ISO
  /** Tratamientos anteriores, si dejó de venir y luego regresó. */
  pastPeriods?: TreatmentPeriod[];
  /** Horario habitual (solo informativo: nunca crea sesiones por sí solo). */
  schedule?: WeeklySlot[];
  /** Duración habitual de la sesión, en minutos. */
  sessionMinutes?: number;
  /** Enlace fijo de videollamada (Zoom, Meet…), si las sesiones son en línea. */
  meetingUrl?: string;
}

export interface Session {
  id: string;
  patientId: string;
  date: string; // ISO
  /** Costo histórico de ESTA sesión. No cambia si después cambia la tarifa del paciente. */
  amount: number;
  /** Nota libre (p. ej. "Doctoralia"). */
  note?: string;
  /** Si asistió, faltó o canceló. Sin valor = asistió (sesiones anteriores o importadas). */
  attendance?: Attendance;
  /**
   * Costo de la sesión antes de marcarla como no cobrada (cancelación): así,
   * si se corrige a "asistió", recupera su costo original.
   */
  listPrice?: number;
}

export type Attendance = "asistio" | "falto" | "cancelo-tarde" | "cancelo";

export const attendanceLabels: Record<Attendance, string> = {
  asistio: "Asistió",
  falto: "Faltó sin avisar",
  "cancelo-tarde": "Canceló tarde",
  cancelo: "Canceló con anticipación",
};

export type SessionStatus = "pagada" | "parcial" | "pendiente";

export type PaymentMethod = "Transferencia" | "Efectivo" | "Tarjeta" | "Otro";

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  date: string; // ISO, fecha de pago
  time?: string; // HH:mm, si el comprobante la incluye
  reference?: string;
  method?: PaymentMethod;
  bank?: string; // banco / plataforma, si se identifica
  concept?: string;
  /** Sesiones a las que se aplica este pago, en el orden en que se abonan. */
  sessionIds: string[];
  source: "manual" | "comprobante" | "importado";
  /**
   * Imagen del comprobante adjunta a este pago (data URL, solo en memoria del
   * navegador — no hay almacenamiento persistente todavía). Se puede
   * adjuntar al registrar por comprobante o después a un pago manual; nunca
   * crea un pago adicional.
   */
  receiptImageUrl?: string;
  createdAt: string; // ISO
}

/** Datos de quien usa la plataforma. Se muestran en la barra lateral. */
export interface Profile {
  name: string;
  specialty?: string;
  /** Datos para que te paguen (banco, CLABE, a nombre de…); se agregan a recordatorios y estados de cuenta. */
  paymentDetails?: string;
  /** Plantilla del recordatorio de pago por WhatsApp (ver src/lib/reminders.ts). */
  reminderTemplate?: string;
  /** Política de cancelación: si se cobra cuando el paciente falta sin avisar (por defecto sí). */
  chargeNoShow?: boolean;
  /** Política de cancelación: si se cobra cuando cancela tarde (por defecto sí). */
  chargeLateCancel?: boolean;
}

/** Vacaciones (o días sin consulta) de quien usa la plataforma. */
export interface Vacation {
  id: string;
  start: string; // ISO, inclusive
  end: string; // ISO, inclusive
  note?: string;
}
