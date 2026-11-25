"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/** Confirmación explícita antes de borrar algo. Nunca se borra sin este paso. */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-dark/75">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
