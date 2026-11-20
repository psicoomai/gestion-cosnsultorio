"use client";

import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input, Notice, cx, inputClass } from "@/components/ui";
import { joinProgram, type JoinState } from "@/lib/actions/public";
import { MONTHS } from "@/lib/birthday";

export function JoinForm() {
  const [state, action] = useActionState<JoinState, FormData>(joinProgram, {});
  const v = state.values;
  const e = state.fieldErrors ?? {};

  return (
    <ActionForm action={action} className="space-y-5" noValidate>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}

      <Field label="Nombre" htmlFor="name" error={e.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="¿Cómo te llamas?"
          defaultValue={v?.name}
          maxLength={60}
          required
          aria-invalid={Boolean(e.name)}
        />
      </Field>

      <Field label="Celular" htmlFor="phone" error={e.phone} hint="A 10 dígitos. Lo usamos para identificar tu tarjeta.">
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="55 1234 5678"
          defaultValue={v?.phone}
          required
          aria-invalid={Boolean(e.phone)}
        />
      </Field>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold text-tinta/85">
          Cumpleaños <span className="font-normal text-tinta/50">(opcional)</span>
        </legend>
        <div className="grid grid-cols-[6rem_1fr] gap-3">
          <label className="sr-only" htmlFor="day">
            Día
          </label>
          <Input
            id="day"
            name="day"
            inputMode="numeric"
            placeholder="Día"
            maxLength={2}
            defaultValue={v?.day}
            aria-invalid={Boolean(e.birthday)}
          />
          <label className="sr-only" htmlFor="month">
            Mes
          </label>
          <select
            id="month"
            name="month"
            defaultValue={v?.month ?? ""}
            className={cx(inputClass, "appearance-none")}
            aria-invalid={Boolean(e.birthday)}
          >
            <option value="">Mes</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {e.birthday ? (
          <p className="text-sm font-medium text-terracota-oscuro">{e.birthday}</p>
        ) : (
          <p className="text-sm text-tinta/55">Para consentirte en tu día.</p>
        )}
      </fieldset>

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-tinta/75">
          <input
            type="checkbox"
            name="consent"
            className="mt-1 h-5 w-5 shrink-0 accent-terracota"
            aria-invalid={Boolean(e.consent)}
          />
          <span>
            Acepto el{" "}
            <Link href="/privacidad" className="font-semibold text-terracota underline underline-offset-2" target="_blank">
              aviso de privacidad
            </Link>{" "}
            y que mis datos se usen para mi tarjeta de sellos.
          </span>
        </label>
        {e.consent ? <p className="text-sm font-medium text-terracota-oscuro">{e.consent}</p> : null}
      </div>

      <SubmitButton size="lg" className="w-full" pendingText="Creando tu tarjeta…">
        Obtener mi tarjeta
      </SubmitButton>
    </ActionForm>
  );
}
