"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Button, Field, Input, cx, inputClass } from "@/components/ui";
import {
  deleteCustomerAction,
  removePointsAction,
  updateCustomerAction,
  type FormState,
} from "@/lib/actions/panel";
import { MONTHS } from "@/lib/birthday";

export function EditCustomerForm({
  customerId,
  name,
  phone,
  day,
  month,
}: {
  customerId: number;
  name: string;
  phone: string;
  day: string;
  month: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateCustomerAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      <Field label="Nombre" htmlFor="edit-name" error={e.name}>
        <Input id="edit-name" name="name" defaultValue={name} maxLength={60} required />
      </Field>
      <Field label="Celular" htmlFor="edit-phone" error={e.phone}>
        <Input id="edit-phone" name="phone" type="tel" inputMode="tel" defaultValue={phone} required />
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold text-tinta/85">Cumpleaños</legend>
        <div className="grid grid-cols-[6rem_1fr] gap-3">
          <Input name="day" inputMode="numeric" placeholder="Día" maxLength={2} defaultValue={day} aria-label="Día" />
          <select name="month" defaultValue={month} className={cx(inputClass, "appearance-none")} aria-label="Mes">
            <option value="">Mes</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {e.birthday ? <p className="text-sm font-medium text-terracota-oscuro">{e.birthday}</p> : null}
      </fieldset>
      <SubmitButton variant="secondary">Guardar datos</SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function RemovePointsForm({ customerId, points }: { customerId: number; points: number }) {
  const [state, action] = useActionState<FormState, FormData>(removePointsAction, {});
  return (
    <ActionForm action={action} className="space-y-2">
      <input type="hidden" name="customerId" value={customerId} />
      <label htmlFor="remove-points" className="block text-sm font-semibold text-tinta/85">
        Restar puntos por error
      </label>
      <div className="flex gap-2">
        <Input
          id="remove-points"
          name="points"
          inputMode="numeric"
          placeholder="0"
          className="max-w-32"
          disabled={points <= 0}
        />
        <SubmitButton variant="danger" disabled={points <= 0} pendingText="…">
          Restar
        </SubmitButton>
      </div>
      {state.fieldErrors?.points ? (
        <p className="text-sm font-medium text-terracota-oscuro">{state.fieldErrors.points}</p>
      ) : null}
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function DeleteCustomerForm({ customerId, name }: { customerId: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(deleteCustomerAction, {});
  if (!open) {
    return (
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Borrar cliente…
      </Button>
    );
  }
  return (
    <ActionForm action={action} className="space-y-3 rounded-2xl bg-terracota/[0.06] p-4 ring-1 ring-terracota/25">
      <input type="hidden" name="customerId" value={customerId} />
      <p className="text-sm leading-relaxed">
        Se borrarán los datos de <strong>{name}</strong>, su tarjeta, sus sellos, puntos e historial. Esto no se puede
        deshacer. Escribe <strong>BORRAR</strong> para confirmar.
      </p>
      <Input name="confirm" autoComplete="off" autoCapitalize="characters" aria-label="Escribe BORRAR" />
      {state.fieldErrors?.confirm ? (
        <p className="text-sm font-medium text-terracota-oscuro">{state.fieldErrors.confirm}</p>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton variant="danger" size="sm" pendingText="Borrando…">
          Borrar definitivamente
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </ActionForm>
  );
}

export function CopyButton({ text, label = "Copiar enlace" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copia el enlace:", text);
        }
      }}
    >
      {copied ? "¡Copiado!" : label}
    </Button>
  );
}
