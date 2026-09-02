"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PaymentModal } from "@/components/payments/PaymentModal";

export function RegisterPaymentButton({ patientId }: { patientId?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Registrar pago</Button>
      <PaymentModal open={open} onClose={() => setOpen(false)} patientId={patientId} />
    </>
  );
}
