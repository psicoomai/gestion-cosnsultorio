"use client";

import { useRef, useState } from "react";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { Modal } from "@/components/ui/Modal";
import type { Payment } from "@/lib/types";

/**
 * Adjunta una imagen de comprobante a un pago YA registrado (manual o por
 * comprobante). Nunca crea un pago nuevo — ver punto 17 de las indicaciones.
 */
export function AttachReceiptButton({ payment }: { payment: Payment }) {
  const { attachReceiptToPayment } = useClinicData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        attachReceiptToPayment(payment.id, reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  if (payment.receiptImageUrl) {
    return (
      <>
        <button type="button" onClick={() => setPreview(true)} className="text-xs text-blue-accent">
          Ver comprobante
        </button>
        <Modal open={preview} onClose={() => setPreview(false)} title="Comprobante adjunto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={payment.receiptImageUrl} alt="Comprobante" className="w-full rounded border border-dark/10" />
        </Modal>
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-blue-accent">
        Adjuntar comprobante
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
