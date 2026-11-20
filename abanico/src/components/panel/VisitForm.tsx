"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState, useEffect, useState } from "react";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input } from "@/components/ui";
import { recordVisitAction, type FormState } from "@/lib/actions/panel";
import { formatMoney } from "@/lib/money";
import { MAX_STAMPS_PER_VISIT, creditForPurchase, parseMoneyToCents, pointsForPurchase } from "@/lib/stamps";

const fmt = new Intl.NumberFormat("es-MX");

/** Registrar una compra: sellos y/o monto (para puntos y saldo a favor), con un solo botón. */
export function VisitForm({
  customerId,
  stampsEnabled,
  pointsEnabled,
  earnAmount,
  earnPoints,
  cashbackEnabled,
  cashbackPercent,
}: {
  customerId: number;
  stampsEnabled: boolean;
  pointsEnabled: boolean;
  earnAmount: number;
  earnPoints: number;
  cashbackEnabled: boolean;
  cashbackPercent: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(recordVisitAction, {});
  const [stamps, setStamps] = useState(stampsEnabled ? 1 : 0);
  const [purchase, setPurchase] = useState("");

  useEffect(() => {
    if (state.ok) {
      setPurchase("");
      setStamps(stampsEnabled ? 1 : 0);
    }
  }, [state, stampsEnabled]);

  const cents = purchase ? parseMoneyToCents(purchase) : null;
  const points = cents && pointsEnabled ? pointsForPurchase(cents, earnAmount, earnPoints) : 0;
  const credit = cents && cashbackEnabled ? creditForPurchase(cents, cashbackPercent) : 0;
  const nothing = stamps === 0 && points === 0 && credit === 0;
  const rules = [
    pointsEnabled ? `${earnPoints === 1 ? "1 punto" : `${earnPoints} puntos`} por cada $${fmt.format(earnAmount)}` : null,
    cashbackEnabled ? `${cashbackPercent} % de saldo a favor` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const preview = [
    points > 0 ? `${fmt.format(points)} ${points === 1 ? "punto" : "puntos"}` : null,
    credit > 0 ? `${formatMoney(credit)} de saldo` : null,
  ]
    .filter(Boolean)
    .join(" y ");

  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      {stampsEnabled ? (
        <div>
          <p className="text-sm font-semibold text-cafe/85">Sellos</p>
          <input type="hidden" name="stamps" value={stamps} />
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              className="h-14 w-14 rounded-2xl bg-papel text-2xl font-semibold ring-1 ring-cafe/15 hover:bg-limon-suave/60 disabled:opacity-40"
              onClick={() => setStamps((n) => Math.max(0, n - 1))}
              disabled={stamps <= 0}
              aria-label="Un sello menos"
            >
              −
            </button>
            <output className="min-w-16 text-center font-display text-4xl font-semibold tabular-nums" aria-live="polite">
              {stamps}
            </output>
            <button
              type="button"
              className="h-14 w-14 rounded-2xl bg-papel text-2xl font-semibold ring-1 ring-cafe/15 hover:bg-limon-suave/60 disabled:opacity-40"
              onClick={() => setStamps((n) => Math.min(MAX_STAMPS_PER_VISIT, n + 1))}
              disabled={stamps >= MAX_STAMPS_PER_VISIT}
              aria-label="Un sello más"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {pointsEnabled || cashbackEnabled ? (
        <Field
          label="Monto de la compra"
          htmlFor={`purchase-${customerId}`}
          error={state.fieldErrors?.purchase}
          hint={
            cents === null && purchase
              ? "Escribe solo números, por ejemplo 85.50"
              : preview
                ? `= ${preview}`
                : rules
          }
        >
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-cafe/50">$</span>
            <Input
              id={`purchase-${customerId}`}
              name="purchase"
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              value={purchase}
              onChange={(e) => setPurchase(e.target.value)}
              className="pl-8 text-lg"
            />
          </div>
        </Field>
      ) : null}

      <SubmitButton size="lg" className="w-full" pendingText="Registrando…" disabled={nothing}>
        {[
          stamps > 0 ? `+${stamps} ${stamps === 1 ? "sello" : "sellos"}` : null,
          points > 0 ? `+${fmt.format(points)} pts` : null,
          credit > 0 ? `+${formatMoney(credit)}` : null,
        ]
          .filter(Boolean)
          .join(" y ") || "Registrar compra"}
      </SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}
