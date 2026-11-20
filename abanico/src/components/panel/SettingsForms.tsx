"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, Button, Field, Input } from "@/components/ui";
import {
  addCatalogItemAction,
  addStaffAction,
  changeMyPasswordAction,
  resetStaffPasswordAction,
  toggleStaffAction,
  updateCatalogItemAction,
  type FormState,
} from "@/lib/actions/panel";

// ---------------------------------------------------------------------------
// Catálogo de premios por puntos
// ---------------------------------------------------------------------------

export function AddCatalogItemForm() {
  const [state, action] = useActionState<FormState, FormData>(addCatalogItemAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} key={state.ok ? state.at : undefined} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
        <Field label="Premio" htmlFor="new-title" error={e.title}>
          <Input id="new-title" name="title" placeholder="Sándwich" maxLength={60} />
        </Field>
        <Field label="Puntos" htmlFor="new-cost" error={e.cost}>
          <Input id="new-cost" name="cost" inputMode="numeric" placeholder="500" />
        </Field>
        <SubmitButton variant="secondary" pendingText="…">
          Agregar
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function CatalogItemRow({ item }: { item: { id: number; title: string; cost: number; active: boolean } }) {
  const [state, action] = useActionState<FormState, FormData>(updateCatalogItemAction, {});
  return (
    <ActionForm action={action} className="space-y-2 py-3">
      <input type="hidden" name="itemId" value={item.id} />
      <div className="grid grid-cols-[1fr_6.5rem] gap-2 sm:grid-cols-[1fr_7rem_auto_auto] sm:items-center">
        <Input name="title" defaultValue={item.title} maxLength={60} aria-label="Premio" />
        <div className="relative">
          <Input name="cost" inputMode="numeric" defaultValue={item.cost} aria-label="Puntos" className="pr-10" />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-cafe/50">pts</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={item.active} className="h-5 w-5 accent-cafe" />
          Visible
        </label>
        <SubmitButton variant="ghost" size="sm" pendingText="…">
          Guardar
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}

// ---------------------------------------------------------------------------
// Equipo
// ---------------------------------------------------------------------------

export function AddStaffForm() {
  const [state, action] = useActionState<FormState, FormData>(addStaffAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} key={state.ok ? state.at : undefined} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nombre" htmlFor="staff-name" error={e.name}>
          <Input id="staff-name" name="name" autoComplete="off" />
        </Field>
        <Field label="Usuario" htmlFor="staff-username" error={e.username}>
          <Input id="staff-username" name="username" autoCapitalize="none" autoCorrect="off" autoComplete="off" />
        </Field>
        <Field label="Contraseña" htmlFor="staff-password" error={e.password} hint="Mínimo 8 caracteres.">
          <Input id="staff-password" name="password" type="password" autoComplete="new-password" />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingText="Creando…">
        Agregar persona
      </SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function StaffRow({
  member,
  isSelf,
}: {
  member: { id: number; name: string; username: string; role: "owner" | "staff"; active: boolean };
  isSelf: boolean;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(resetStaffPasswordAction, {});
  return (
    <li className="space-y-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {member.name} {isSelf ? <span className="font-normal text-cafe/50">(tú)</span> : null}
          </p>
          <p className="text-sm text-cafe/55">
            {member.username} · {member.role === "owner" ? "Dueña/o" : "Equipo"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!member.active ? <Badge>Desactivado</Badge> : null}
          {member.role === "staff" ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setResetOpen(!resetOpen)}>
                Cambiar contraseña
              </Button>
              <form action={toggleStaffAction}>
                <input type="hidden" name="staffId" value={member.id} />
                <input type="hidden" name="active" value={member.active ? "0" : "1"} />
                <SubmitButton variant={member.active ? "danger" : "secondary"} size="sm" pendingText="…">
                  {member.active ? "Desactivar" : "Reactivar"}
                </SubmitButton>
              </form>
            </>
          ) : null}
        </div>
      </div>
      {resetOpen ? (
        <ActionForm action={action} className="flex flex-wrap items-start gap-2">
          <input type="hidden" name="staffId" value={member.id} />
          <div className="min-w-48 flex-1">
            <Input name="password" type="password" placeholder="Nueva contraseña" autoComplete="new-password" aria-label="Nueva contraseña" />
            {state.fieldErrors?.password ? (
              <p className="mt-1 text-sm font-medium text-alerta">{state.fieldErrors.password}</p>
            ) : null}
          </div>
          <SubmitButton variant="secondary" pendingText="…">
            Guardar
          </SubmitButton>
          <FormMessage state={state} className="w-full" />
        </ActionForm>
      ) : null}
    </li>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changeMyPasswordAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} key={state.ok ? state.at : undefined} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Contraseña actual" htmlFor="current" error={e.current}>
          <Input id="current" name="current" type="password" autoComplete="current-password" />
        </Field>
        <Field label="Nueva contraseña" htmlFor="new-password" error={e.password}>
          <Input id="new-password" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label="Repite la nueva" htmlFor="confirm-password" error={e.confirm}>
          <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingText="Guardando…">
        Cambiar mi contraseña
      </SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}
