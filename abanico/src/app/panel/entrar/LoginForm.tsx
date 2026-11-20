"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState } from "react";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input } from "@/components/ui";
import { login, type FormState } from "@/lib/actions/panel";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  return (
    <ActionForm action={action} className="space-y-5">
      <FormMessage state={state} />
      <Field label="Usuario" htmlFor="username">
        <Input id="username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" required />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Entrando…">
        Entrar
      </SubmitButton>
    </ActionForm>
  );
}
