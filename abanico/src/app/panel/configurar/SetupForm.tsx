"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState } from "react";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input } from "@/components/ui";
import { setupBusiness, type FormState } from "@/lib/actions/panel";

export function SetupForm({ needsCode }: { needsCode: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(setupBusiness, {});
  const e = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="space-y-5">
      <FormMessage state={state} />
      {needsCode ? (
        <Field label="Código de configuración" htmlFor="setupCode" error={e.setupCode} hint="El valor de SETUP_CODE del servidor.">
          <Input id="setupCode" name="setupCode" autoComplete="off" required />
        </Field>
      ) : null}
      <Field label="Nombre del negocio" htmlFor="businessName" error={e.businessName}>
        <Input id="businessName" name="businessName" defaultValue="Abanico" required />
      </Field>
      <Field label="Tu nombre" htmlFor="name" error={e.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Usuario para entrar" htmlFor="username" error={e.username} hint="Por ejemplo: abanico o tu nombre.">
        <Input id="username" name="username" autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={e.password} hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={e.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </ActionForm>
  );
}
