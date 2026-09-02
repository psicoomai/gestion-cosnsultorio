"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { formatCurrency, formatDate } from "@/lib/format";
import { patientSessions, sessionPaidMap, sessionStatus } from "@/lib/metrics";
import type { Currency, Payment, Session } from "@/lib/types";

export function SessionPicker({
  patientId,
  sessions,
  payments,
  currency,
  selected,
  onChange,
}: {
  patientId: string;
  sessions: Session[];
  payments: Payment[];
  currency: Currency;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const paidMap = sessionPaidMap(
    sessions,
    payments.filter((p) => p.patientId === patientId)
  );
  const candidates = patientSessions(patientId, sessions)
    .filter((s) => (paidMap.get(s.id) ?? 0) < s.amount)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (candidates.length === 0) {
    return <p className="text-sm text-dark/50">Este paciente no tiene sesiones con saldo pendiente.</p>;
  }

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="max-h-40 overflow-y-auto rounded border border-dark/15">
      {candidates.map((session) => {
        const paid = paidMap.get(session.id) ?? 0;
        const pending = session.amount - paid;
        const status = sessionStatus(session, paid);
        return (
          <label
            key={session.id}
            className="flex cursor-pointer items-center justify-between gap-3 border-b border-dark/10 px-3 py-2 text-sm last:border-b-0 hover:bg-dark/[0.03]"
          >
            <span className="flex items-center gap-2">
              <Checkbox checked={selected.includes(session.id)} onChange={() => toggle(session.id)} />
              {formatDate(session.date)}
              <span className="text-xs text-dark/45">
                ({status === "parcial" ? "pago parcial" : "pendiente"})
              </span>
            </span>
            <span className="font-medium text-debt-red">{formatCurrency(pending, currency)}</span>
          </label>
        );
      })}
    </div>
  );
}
