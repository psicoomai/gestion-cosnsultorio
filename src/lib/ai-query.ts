// "Consultas IA": un analizador de intención simple, determinístico y
// local — NO llama a ningún servicio de IA externo, no usa API key, no
// tiene costo. Interpreta la pregunta en lenguaje natural (patrón de
// palabras clave + coincidencia de nombre de paciente) para identificar
// intención + entidades, y SIEMPRE calcula la respuesta con las funciones
// reales de src/lib/metrics.ts a partir de sesiones y pagos existentes.
// Nunca inventa ni estima una cifra: si no hay datos suficientes, lo dice.
//
// Esto es intencionalmente más limitado que un modelo de lenguaje real
// (frases fuera de los patrones cubiertos no se reconocen). Conectar un
// LLM real para ampliar la comprensión de lenguaje natural requeriría un
// servicio externo con API key — eso se propone y se autoriza aparte,
// nunca se activa por defecto aquí.

import { matchPatientsByText } from "@/lib/name-match";
import { formatCurrency } from "@/lib/format";
import {
  allPatientsTotalsByCurrency,
  currentMonthKey,
  monthKey,
  monthLabel,
  patientSessions,
  patientTotals,
} from "@/lib/metrics";
import type { Currency, Patient, Payment, Session } from "@/lib/types";

export interface QueryResult {
  answer: string;
  matchedIntent: boolean;
}

const MONTH_NAMES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const STOPWORDS = new Set([
  "cuanto",
  "cuantos",
  "cuantas",
  "cuanta",
  "me",
  "debe",
  "deben",
  "debo",
  "adeuda",
  "adeudo",
  "saldo",
  "pendiente",
  "pago",
  "pagos",
  "pague",
  "pagado",
  "pagada",
  "ha",
  "han",
  "su",
  "sus",
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "en",
  "este",
  "esta",
  "ese",
  "esa",
  "mes",
  "total",
  "recibi",
  "recibido",
  "recibida",
  "cobrado",
  "cobre",
  "quien",
  "quienes",
  "sesiones",
  "sesion",
  "tuvo",
  "tuvieron",
  "durante",
  "todo",
  "toda",
  "tratamiento",
  "y",
  "a",
  "que",
  "es",
  "son",
  "o",
  "un",
  "una",
  "mi",
  "le",
  "les",
  "por",
  "para",
  "con",
]);

function clean(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,]/g, "")
    .trim();
}

function stripStopwords(q: string): string {
  return q
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .join(" ");
}

function detectMonth(q: string): string | undefined {
  if (/\beste mes\b/.test(q)) return currentMonthKey();
  if (/\bmes pasado\b/.test(q)) {
    const [y, m] = currentMonthKey().split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  for (const [name, num] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) {
      return `${new Date().getFullYear()}-${String(num).padStart(2, "0")}`;
    }
  }
  return undefined;
}

function pendingBalancePatient(patient: Patient, sessions: Session[], payments: Payment[]): QueryResult {
  const t = patientTotals(patient.id, sessions, payments);
  if (t.sessionsCount === 0) {
    return { matchedIntent: true, answer: `${patient.name} no tiene sesiones registradas.` };
  }
  if (t.pending <= 0) {
    return { matchedIntent: true, answer: `${patient.name} no tiene saldo pendiente — está al corriente.` };
  }
  return { matchedIntent: true, answer: `${patient.name} debe ${formatCurrency(t.pending, patient.currency)}.` };
}

function paidByPatient(
  patient: Patient,
  sessions: Session[],
  payments: Payment[],
  month?: string
): QueryResult {
  const t = patientTotals(patient.id, sessions, payments, month);
  if (month && t.sessionsCount === 0) {
    return { matchedIntent: true, answer: `${patient.name} no tiene sesiones en ${monthLabel(month)}.` };
  }
  const periodPhrase = month ? `en ${monthLabel(month)}` : "en total (histórico)";
  return {
    matchedIntent: true,
    answer: `${patient.name} ha pagado ${formatCurrency(t.paid, patient.currency)} ${periodPhrase}.`,
  };
}

function sessionsCountPatient(patient: Patient, sessions: Session[], month?: string): QueryResult {
  const all = patientSessions(patient.id, sessions);
  const scoped = month ? all.filter((s) => monthKey(s.date) === month) : all;
  const periodPhrase = month ? ` en ${monthLabel(month)}` : "";
  return {
    matchedIntent: true,
    answer: `${patient.name} tuvo ${scoped.length} sesión${scoped.length === 1 ? "" : "es"}${periodPhrase}.`,
  };
}

function listDebtors(patients: Patient[], sessions: Session[], payments: Payment[]): QueryResult {
  const debtors = patients
    .map((p) => ({ p, t: patientTotals(p.id, sessions, payments) }))
    .filter(({ t }) => t.pending > 0)
    .sort((a, b) => b.t.pending - a.t.pending);
  if (debtors.length === 0) {
    return { matchedIntent: true, answer: "Nadie tiene saldo pendiente en este momento." };
  }
  const lines = debtors.map(({ p, t }) => `${p.name}: ${formatCurrency(t.pending, p.currency)}`);
  return { matchedIntent: true, answer: `Pacientes con saldo pendiente:\n${lines.join("\n")}` };
}

function totalPending(patients: Patient[], sessions: Session[], payments: Payment[]): QueryResult {
  const byCurrency = allPatientsTotalsByCurrency(patients, sessions, payments);
  const entries = Object.entries(byCurrency).filter(([, t]) => t.pending > 0);
  if (entries.length === 0) {
    return { matchedIntent: true, answer: "No hay saldo pendiente en este momento." };
  }
  const parts = entries.map(([currency, t]) => formatCurrency(t.pending, currency as Currency));
  return { matchedIntent: true, answer: `En total te deben ${parts.join(" y ")}.` };
}

function receivedPeriod(
  patients: Patient[],
  sessions: Session[],
  payments: Payment[],
  month: string
): QueryResult {
  const byCurrency = allPatientsTotalsByCurrency(patients, sessions, payments, month);
  const entries = Object.entries(byCurrency);
  if (entries.length === 0) {
    return { matchedIntent: true, answer: `No hay datos registrados para ${monthLabel(month)}.` };
  }
  const parts = entries.map(([currency, t]) => formatCurrency(t.paid, currency as Currency));
  return { matchedIntent: true, answer: `Recibiste ${parts.join(" y ")} en ${monthLabel(month)}.` };
}

export function answerQuery(
  question: string,
  patients: Patient[],
  sessions: Session[],
  payments: Payment[]
): QueryResult {
  const q = clean(question);
  if (!q) {
    return { matchedIntent: false, answer: "Escribe una pregunta primero." };
  }

  const month = detectMonth(q);
  const candidates = matchPatientsByText(stripStopwords(q), patients);
  const patient = candidates[0];

  const mentionsDebt = /\b(deb|adeud)/.test(q);
  const mentionsWho = /\b(quien|quienes)\b/.test(q);
  const mentionsSessions = /\bsesion/.test(q);
  const mentionsPaid = /\b(pag|recib|cobr)/.test(q);
  const mentionsTotal = /\btotal\b/.test(q) || /me deben/.test(q);
  const mentionsHistoric = /\b(tratamiento|siempre)\b/.test(q);

  if (mentionsWho && mentionsDebt) {
    return listDebtors(patients, sessions, payments);
  }
  if (patient && mentionsDebt) {
    return pendingBalancePatient(patient, sessions, payments);
  }
  if (patient && mentionsSessions) {
    return sessionsCountPatient(patient, sessions, month);
  }
  if (patient && mentionsPaid) {
    return paidByPatient(patient, sessions, payments, mentionsHistoric ? undefined : month);
  }
  if (!patient && mentionsDebt && mentionsTotal) {
    return totalPending(patients, sessions, payments);
  }
  if (!patient && mentionsPaid) {
    return receivedPeriod(patients, sessions, payments, month ?? currentMonthKey());
  }
  if (patient) {
    // Se identificó un paciente pero no una intención numérica clara: el
    // dato más útil por defecto es su saldo pendiente.
    return pendingBalancePatient(patient, sessions, payments);
  }

  return {
    matchedIntent: false,
    answer:
      'No entendí tu pregunta. Prueba algo como: "¿Cuánto me debe [nombre]?", "¿Cuánto recibí este mes?" o "¿Quién me debe?".',
  };
}
