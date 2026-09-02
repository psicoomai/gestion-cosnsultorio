"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { PaymentModal } from "@/components/payments/PaymentModal";

export function RegisterPaymentButton({
  patientId,
  initialTab = "manual",
  children,
  ...buttonProps
}: {
  patientId?: string;
  initialTab?: "manual" | "comprobante";
} & ButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} {...buttonProps}>
        {children ?? "Registrar pago"}
      </Button>
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        patientId={patientId}
        initialTab={initialTab}
      />
    </>
  );
}
