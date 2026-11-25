"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { NewSessionModal } from "@/components/sessions/NewSessionModal";

export function NewSessionButton({
  patientId,
  initialDate,
  children,
  ...buttonProps
}: { patientId?: string; initialDate?: string } & ButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} {...buttonProps}>
        {children ?? "Nueva sesión"}
      </Button>
      {open ? (
        <NewSessionModal open onClose={() => setOpen(false)} patientId={patientId} initialDate={initialDate} />
      ) : null}
    </>
  );
}
