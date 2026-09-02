"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { NewSessionModal } from "@/components/sessions/NewSessionModal";

export function NewSessionButton({
  patientId,
  children,
  ...buttonProps
}: { patientId?: string } & ButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} {...buttonProps}>
        {children ?? "Nueva sesión"}
      </Button>
      <NewSessionModal open={open} onClose={() => setOpen(false)} patientId={patientId} />
    </>
  );
}
