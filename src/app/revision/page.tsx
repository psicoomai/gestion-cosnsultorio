"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReconciliationCard } from "@/components/review/ReconciliationCard";
import { ReminderButton } from "@/components/billing/ReminderButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { issueKindLabels, runChecks, unappliedTotal, type Issue, type IssueKind } from "@/lib/checks";
import { yearSummary } from "@/lib/metrics";

const severityBadge = {
  atencion: { variant: "accent", label: "Revisar" },
  adeudo: { variant: "debt", label: "Adeudo" },
  info: { variant: "neutral", label: "Aviso" },
} as const;

export default function RevisionPage() {
  const { patients, sessions, payments, vacations } = useClinicData();
  const issues = useMemo(() => runChecks(patients, sessions, payments, new Date(), vacations), [patients, sessions, payments, vacations]);
  const summary = useMemo(
    () => yearSummary(patients, sessions, payments, new Date().getFullYear()),
    [patients, sessions, payments]
  );
  const unapplied = useMemo(() => unappliedTotal(sessions, payments), [sessions, payments]);

  const groups = useMemo(() => {
    const map = new Map<IssueKind, Issue[]>();
    for (const issue of issues) map.set(issue.kind, [...(map.get(issue.kind) ?? []), issue]);
    return [...map.entries()];
  }, [issues]);

  const toReview = issues.filter((i) => i.severity === "atencion").length;
  const patientById = new Map(patients.map((p) => [p.id, p]));

  return (
    <AppShell
      title="Revisión"
      description="Se revisa sola cada vez que registras algo. Aquí aparece lo que parece un error de captura."
    >
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-6">
          {issues.length === 0 ? (
            <EmptyState
              title="Todo en orden"
              description="No hay pagos duplicados, fechas extrañas, dinero sin aplicar ni adeudos viejos."
            />
          ) : (
            groups.map(([kind, list]) => (
              <Card key={kind}>
                <CardHeader>
                  <CardTitle>{issueKindLabels[kind]}</CardTitle>
                  <Badge variant={severityBadge[list[0].severity].variant}>
                    {list.length} · {severityBadge[list[0].severity].label}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="divide-y divide-dark/10">
                    {list.map((issue) => (
                      <li key={issue.id} className="flex items-start justify-between gap-4 py-3">
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              issue.severity === "adeudo" ? "text-debt-red" : "text-dark"
                            )}
                          >
                            {issue.title}
                          </p>
                          <p className="mt-0.5 text-sm text-dark/65">{issue.detail}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Link href={`/pacientes/${issue.patientId}`} className="text-sm text-blue-accent">
                            {issue.severity === "adeudo" ? "Ver paciente →" : "Corregir →"}
                          </Link>
                          {issue.kind === "pendiente-antiguo" && patientById.get(issue.patientId) ? (
                            <ReminderButton patient={patientById.get(issue.patientId)!} compact />
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">Por revisar</p>
              <p className={cn("mt-2 font-serif text-3xl", toReview > 0 ? "text-orange-accent" : "text-dark")}>
                {toReview}
              </p>
              <p className="mt-1 text-xs text-dark/50">
                Posibles errores de captura. Los adeudos y avisos no cuentan aquí.
              </p>
            </CardContent>
          </Card>
          <ReconciliationCard summary={summary} unapplied={unapplied} />
          <Card>
            <CardContent className="pt-5 text-xs leading-relaxed text-dark/60">
              <p className="mb-1 font-semibold uppercase tracking-wideish text-dark/55">Lo que ya no puede pasar</p>
              Cada sesión pertenece al mes de su fecha y cada paciente entra siempre en los totales: no hay
              listas de hojas ni rangos de filas que mantener a mano, así que un paciente no puede quedar
              fuera del cobrado ni una sesión contarse en dos meses.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
