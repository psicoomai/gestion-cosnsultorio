"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { runChecks } from "@/lib/checks";

/** Recordatorio en el panel: cuántos posibles errores de captura hay. */
export function ReviewSummary() {
  const { patients, sessions, payments, vacations } = useClinicData();
  const count = useMemo(
    () => runChecks(patients, sessions, payments, new Date(), vacations).filter((i) => i.severity === "atencion").length,
    [patients, sessions, payments, vacations]
  );

  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">Revisión de datos</p>
        <p className={cn("mt-2 font-serif text-2xl", count > 0 ? "text-orange-accent" : "text-dark")}>
          {count === 0 ? "Todo cuadra" : `${count} por revisar`}
        </p>
        <p className="mt-1 text-xs text-dark/50">
          {count === 0
            ? "Sin pagos duplicados, fechas extrañas ni dinero sin aplicar."
            : "Posibles duplicados, fechas mal escritas o pagos sin aplicar."}
        </p>
        <Link href="/revision" className="mt-3 inline-block text-xs text-blue-accent">
          Ver revisión →
        </Link>
      </CardContent>
    </Card>
  );
}
