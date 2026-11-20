"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input, Textarea, cx } from "@/components/ui";
import { saveProgramAction, type FormState } from "@/lib/actions/panel";
import { CASHBACK_MAX, CASHBACK_MIN, STAMPS_MAX, STAMPS_MIN } from "@/lib/stamps";

export type ProgramValues = {
  businessName: string;
  rewardTerms: string;
  stampsEnabled: boolean;
  stampsRequired: number;
  rewardTitle: string;
  pointsEnabled: boolean;
  welcomeStamps: number;
  cooldownMinutes: number;
  earnAmount: number;
  earnPoints: number;
  cashbackEnabled: boolean;
  cashbackPercent: number;
};

function Toggle({
  name,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition",
        checked ? "bg-limon-suave ring-cafe/30" : "bg-white ring-cafe/15"
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-cafe"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-cafe/60">{description}</span>
      </span>
    </label>
  );
}

export function ProgramForm({ initial }: { initial: ProgramValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveProgramAction, {});
  const [stampsEnabled, setStampsEnabled] = useState(initial.stampsEnabled);
  const [pointsEnabled, setPointsEnabled] = useState(initial.pointsEnabled);
  const [cashbackEnabled, setCashbackEnabled] = useState(initial.cashbackEnabled);
  const e = state.fieldErrors ?? {};

  return (
    <ActionForm action={action} className="space-y-6">
      <Field label="Nombre del negocio" htmlFor="businessName" error={e.businessName}>
        <Input id="businessName" name="businessName" defaultValue={initial.businessName} maxLength={40} required />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-cafe/85">Programas activos</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle
            name="stampsEnabled"
            checked={stampsEnabled}
            onChange={setStampsEnabled}
            label="Tarjeta de sellos"
            description="Un sello por compra; al completarla gana la recompensa."
          />
          <Toggle
            name="pointsEnabled"
            checked={pointsEnabled}
            onChange={setPointsEnabled}
            label="Puntos"
            description="Puntos según lo que gasta, para cambiar por premios."
          />
          <Toggle
            name="cashbackEnabled"
            checked={cashbackEnabled}
            onChange={setCashbackEnabled}
            label="Reembolso en efectivo"
            description="Un % de cada compra se le devuelve como saldo a favor."
          />
        </div>
        {e.programs ? <p className="text-sm font-medium text-alerta">{e.programs}</p> : null}
      </div>

      <fieldset className={cx("space-y-4 rounded-2xl p-4 ring-1 ring-cafe/10 sm:p-5", !stampsEnabled && "opacity-60")}>
        <legend className="px-1 font-sans text-base font-bold">Tarjeta de sellos</legend>
        <p className="text-sm text-cafe/60">Al completar la tarjeta, el cliente gana la recompensa y la tarjeta vuelve a empezar.</p>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Field
            label="Sellos para completarla"
            htmlFor="stampsRequired"
            error={e.stampsRequired}
            hint={`De ${STAMPS_MIN} a ${STAMPS_MAX}.`}
          >
            <Input id="stampsRequired" name="stampsRequired" inputMode="numeric" defaultValue={initial.stampsRequired} />
          </Field>
          <Field label="Recompensa" htmlFor="rewardTitle" error={e.rewardTitle} hint="Por ejemplo: Bebida gratis.">
            <Input id="rewardTitle" name="rewardTitle" defaultValue={initial.rewardTitle} maxLength={60} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sellos de bienvenida"
            htmlFor="welcomeStamps"
            error={e.welcomeStamps}
            hint="Sellos de regalo al registrarse (0 = ninguno)."
          >
            <Input id="welcomeStamps" name="welcomeStamps" inputMode="numeric" defaultValue={initial.welcomeStamps} />
          </Field>
          <Field
            label="Minutos entre sellos"
            htmlFor="cooldownMinutes"
            error={e.cooldownMinutes}
            hint="Evita sellar dos veces seguidas (0 = sin límite)."
          >
            <Input id="cooldownMinutes" name="cooldownMinutes" inputMode="numeric" defaultValue={initial.cooldownMinutes} />
          </Field>
        </div>
      </fieldset>

      <fieldset className={cx("space-y-3 rounded-2xl p-4 ring-1 ring-cafe/10 sm:p-5", !pointsEnabled && "opacity-60")}>
        <legend className="px-1 font-sans text-base font-bold">Cómo se ganan los puntos</legend>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>El cliente gana</span>
          <div className="w-20">
            <Input name="earnPoints" inputMode="numeric" defaultValue={initial.earnPoints} className="text-center" aria-label="Puntos" />
          </div>
          <span>{"punto(s) por cada $"}</span>
          <div className="w-24">
            <Input name="earnAmount" inputMode="numeric" defaultValue={initial.earnAmount} className="text-center" aria-label="Pesos" />
          </div>
          <span>de compra.</span>
        </div>
        {e.earn ? <p className="text-sm font-medium text-alerta">{e.earn}</p> : null}
        <p className="text-sm text-cafe/60">Los premios que se cambian por puntos se configuran en el catálogo de abajo.</p>
      </fieldset>

      <fieldset className={cx("space-y-3 rounded-2xl p-4 ring-1 ring-cafe/10 sm:p-5", !cashbackEnabled && "opacity-60")}>
        <legend className="px-1 font-sans text-base font-bold">Reembolso en efectivo</legend>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>El cliente recibe el</span>
          <div className="w-20">
            <Input
              name="cashbackPercent"
              inputMode="numeric"
              defaultValue={initial.cashbackPercent}
              className="text-center"
              aria-label="Porcentaje de reembolso"
            />
          </div>
          <span>% de cada compra como saldo a favor.</span>
        </div>
        {e.cashbackPercent ? <p className="text-sm font-medium text-alerta">{e.cashbackPercent}</p> : null}
        <p className="text-sm text-cafe/60">
          {`De ${CASHBACK_MIN} a ${CASHBACK_MAX} %. El saldo lo aplica el equipo en caja como descuento en una compra siguiente.`}
        </p>
      </fieldset>

      <Field
        label="Condiciones de los premios"
        htmlFor="rewardTerms"
        error={e.rewardTerms}
        hint="Aparece en la tarjeta del cliente."
      >
        <Textarea id="rewardTerms" name="rewardTerms" rows={2} maxLength={300} defaultValue={initial.rewardTerms} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Guardando…">Guardar programa</SubmitButton>
        <FormMessage state={state} className="flex-1" />
      </div>
    </ActionForm>
  );
}
