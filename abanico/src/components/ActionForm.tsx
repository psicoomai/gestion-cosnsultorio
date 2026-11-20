"use client";

import { createContext, useContext, useTransition, type ComponentProps } from "react";

const PendingContext = createContext<boolean | null>(null);

/** `true` mientras el ActionForm más cercano está enviando; `null` si no hay ninguno. */
export function useActionFormPending(): boolean | null {
  return useContext(PendingContext);
}

/**
 * Formulario que envía a una acción del servidor SIN vaciar los campos al
 * terminar (React 19 los vacía en los formularios con `action`). Así, si hay
 * un error de validación, la persona no pierde lo que escribió. Para vaciarlo
 * tras un envío exitoso, cámbiale la `key`.
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (formData: FormData) => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={pending}>
      <form
        {...props}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const formData = new FormData(event.currentTarget, submitter);
          startTransition(() => action(formData));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}
