// Estado de cuenta de un paciente en PDF: sesiones del periodo con lo pagado
// y lo pendiente, pagos recibidos, totales y tus datos para pago. Se genera
// en el navegador; ningún dato sale del dispositivo para hacerlo.

import { formatCurrency, formatDate, todayIso } from "@/lib/format";
import { allocatePayments, roundCents } from "@/lib/metrics";
import type { Patient, Payment, Profile, Session } from "@/lib/types";

export type StatementScope = { kind: "pendientes" } | { kind: "anio"; year: number } | { kind: "todo" };

export interface StatementRow {
  date: string;
  amount: number;
  paid: number;
  pending: number;
  note?: string;
}

export interface StatementData {
  rows: StatementRow[];
  payments: Payment[];
  totals: { amount: number; paid: number; pending: number };
  periodLabel: string;
}

/** Datos del estado de cuenta (separado del dibujo del PDF para poder probarlo). */
export function statementData(
  patient: Patient,
  sessions: Session[],
  payments: Payment[],
  scope: StatementScope
): StatementData {
  const own = sessions.filter((s) => s.patientId === patient.id).sort((a, b) => a.date.localeCompare(b.date));
  const ownPayments = payments.filter((p) => p.patientId === patient.id);
  const { sessionPaid } = allocatePayments(own, ownPayments);
  let rows: StatementRow[] = own.map((s) => {
    const paid = roundCents(Math.min(sessionPaid.get(s.id) ?? 0, s.amount));
    return { date: s.date, amount: s.amount, paid, pending: roundCents(s.amount - paid), note: s.note };
  });
  let periodLabel = "Todo el historial";
  if (scope.kind === "anio") {
    rows = rows.filter((r) => r.date.startsWith(`${scope.year}-`));
    periodLabel = `Año ${scope.year}`;
  } else if (scope.kind === "pendientes") {
    rows = rows.filter((r) => r.pending > 0.009);
    periodLabel = "Sesiones pendientes de pago";
  }
  // En "solo pendientes" no se listan pagos: el documento es para cobrar lo que falta.
  const relevantPayments = ownPayments
    .filter((p) =>
      scope.kind === "anio" ? p.date.startsWith(`${scope.year}-`) : scope.kind === "todo" ? true : false
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const totals = rows.reduce(
    (acc, r) => ({ amount: acc.amount + r.amount, paid: acc.paid + r.paid, pending: acc.pending + r.pending }),
    { amount: 0, paid: 0, pending: 0 }
  );
  return {
    rows,
    payments: relevantPayments,
    totals: { amount: roundCents(totals.amount), paid: roundCents(totals.paid), pending: roundCents(totals.pending) },
    periodLabel,
  };
}

export async function buildStatementPdf(
  patient: Patient,
  data: StatementData,
  profile: Profile | null
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const money = (v: number) => formatCurrency(v, patient.currency);
  const left = 56;
  const right = 556;
  let y = 64;

  const ensureSpace = (needed: number) => {
    if (y + needed > 740) {
      doc.addPage();
      y = 64;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Estado de cuenta", left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Emitido el ${formatDate(todayIso())}`, right, y, { align: "right" });
  y += 22;
  if (profile?.name) {
    doc.setFontSize(11);
    doc.text([profile.name, profile.specialty].filter(Boolean).join(" - "), left, y);
    y += 16;
  }
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("PACIENTE", left, y);
  doc.text("PERIODO", 320, y);
  doc.setTextColor(0);
  y += 14;
  doc.setFontSize(12);
  doc.text(patient.name, left, y);
  doc.text(data.periodLabel, 320, y);
  y += 30;

  // Tabla de sesiones
  const cols = [left, 170, 270, 370, 470];
  const header = ["Fecha", "Costo", "Pagado", "Pendiente", "Nota"];
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  header.forEach((h, i) => doc.text(h, i > 0 && i < 4 ? cols[i] + 80 : cols[i], y, { align: i > 0 && i < 4 ? "right" : "left" }));
  y += 6;
  doc.setDrawColor(180);
  doc.line(left, y, right, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  if (data.rows.length === 0) {
    doc.text("No hay sesiones en este periodo.", left, y);
    y += 16;
  }
  for (const r of data.rows) {
    ensureSpace(16);
    doc.text(formatDate(r.date), cols[0], y);
    doc.text(money(r.amount), cols[1] + 80, y, { align: "right" });
    doc.text(money(r.paid), cols[2] + 80, y, { align: "right" });
    doc.text(r.pending > 0.009 ? money(r.pending) : "-", cols[3] + 80, y, { align: "right" });
    if (r.note) doc.text(doc.splitTextToSize(r.note, right - cols[4])[0] ?? "", cols[4], y);
    y += 16;
  }
  doc.line(left, y - 8, right, y - 8);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`${data.rows.length} ${data.rows.length === 1 ? "sesión" : "sesiones"}`, cols[0], y);
  doc.text(money(data.totals.amount), cols[1] + 80, y, { align: "right" });
  doc.text(money(data.totals.paid), cols[2] + 80, y, { align: "right" });
  doc.text(money(data.totals.pending), cols[3] + 80, y, { align: "right" });
  y += 32;

  if (data.payments.length > 0) {
    ensureSpace(40);
    doc.setFontSize(11);
    doc.text("Pagos recibidos", left, y);
    y += 16;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (const p of data.payments) {
      ensureSpace(14);
      doc.text(formatDate(p.date), left, y);
      doc.text(money(p.amount), 250, y, { align: "right" });
      const detail = [p.method, p.reference ? `ref. ${p.reference}` : null].filter(Boolean).join(" - ");
      if (detail) doc.text(detail, 270, y);
      y += 14;
    }
    y += 18;
  }

  ensureSpace(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Saldo pendiente: ${money(data.totals.pending)}`, left, y);
  y += 22;
  if (profile?.paymentDetails?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Datos para pago:", left, y);
    y += 14;
    for (const line of doc.splitTextToSize(profile.paymentDetails.trim(), right - left)) {
      ensureSpace(14);
      doc.text(line, left, y);
      y += 14;
    }
  }

  return doc.output("blob");
}

export function statementFilename(patient: Patient, scope: StatementScope): string {
  const safe = patient.name.replace(/[^\p{L}\p{N} ]/gu, "").trim().replace(/\s+/g, "-") || "paciente";
  const suffix = scope.kind === "anio" ? String(scope.year) : scope.kind === "pendientes" ? "pendientes" : "historial";
  return `Estado de cuenta ${safe} ${suffix}.pdf`;
}
