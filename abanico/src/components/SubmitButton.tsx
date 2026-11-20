"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { useActionFormPending } from "@/components/ActionForm";
import { Button } from "@/components/ui";

/** Botón de envío que se desactiva y muestra un texto mientras se procesa el formulario. */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const status = useFormStatus();
  const actionFormPending = useActionFormPending();
  const pending = actionFormPending ?? status.pending;
  return (
    <Button type="submit" {...props} disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? (pendingText ?? "Guardando…") : children}
    </Button>
  );
}
