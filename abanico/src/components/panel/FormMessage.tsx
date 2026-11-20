"use client";

import { Notice } from "@/components/ui";
import type { FormState } from "@/lib/actions/panel";

/** Muestra el resultado (éxito o error general) de una acción de formulario. */
export function FormMessage({ state, className }: { state: FormState; className?: string }) {
  if (state.error) {
    return (
      <Notice key={state.at} tone="error" className={className}>
        {state.error}
      </Notice>
    );
  }
  if (state.ok && state.message) {
    return (
      <Notice key={state.at} tone="success" className={["animate-float-up", className].filter(Boolean).join(" ")}>
        {state.message}
      </Notice>
    );
  }
  return null;
}
