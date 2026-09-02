"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  widthClassName?: string;
}

export function Modal({ open, onClose, title, description, children, widthClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-dark/40 px-4 py-10">
      <button
        type="button"
        aria-label="Cerrar"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full rounded-md border border-dark/10 bg-background p-6 shadow-card",
          widthClassName ?? "max-w-lg"
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-dark">{title}</h2>
            {description ? <p className="mt-1 text-sm text-dark/60">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-sm px-2 py-1 text-sm text-dark/50 hover:bg-dark/[0.06] hover:text-dark"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
