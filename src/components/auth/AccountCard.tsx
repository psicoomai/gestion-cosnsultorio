"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";

/** Cuenta: correo, cambiar contraseña y eliminar la cuenta con todos sus datos. */
export function AccountCard() {
  const auth = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth?.user) return null;

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await auth!.changePassword(current, next);
      setCurrent("");
      setNext("");
      setMessage({ ok: true, text: "Contraseña actualizada. Se cerró la sesión en tus otros dispositivos." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "No se pudo cambiar la contraseña." });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== "ELIMINAR") {
      setDeleteError('Escribe ELIMINAR para confirmar.');
      return;
    }
    setBusy(true);
    try {
      await auth!.deleteAccount(deletePassword);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuenta</CardTitle>
        <p className="text-sm text-dark/60">{auth.user.email}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0 text-sm">
        <form onSubmit={changePassword} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          <FormField label="Contraseña actual" htmlFor="pwd-current">
            <Input
              id="pwd-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </FormField>
          <FormField label="Nueva contraseña" htmlFor="pwd-new" hint="Mínimo 8 caracteres.">
            <Input
              id="pwd-new"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </FormField>
          <Button type="submit" variant="secondary" disabled={busy || !current || !next}>
            Cambiar contraseña
          </Button>
        </form>
        {message ? <p className={message.ok ? "text-dark/70" : "text-orange-accent"}>{message.text}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dark/10 pt-4">
          <p className="text-dark/60">
            Lee el{" "}
            <Link href="/privacidad" className="text-blue-accent">
              aviso de privacidad
            </Link>
            . Puedes eliminar tu cuenta y todos sus datos cuando quieras.
          </p>
          <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
            Eliminar mi cuenta…
          </Button>
        </div>
      </CardContent>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="¿Eliminar tu cuenta?"
        description="Se borrarán tu cuenta, todos tus pacientes, sesiones y pagos. No se puede deshacer. Si quieres conservar tu información, descarga antes un respaldo."
      >
        <div className="flex flex-col gap-4">
          <FormField label="Tu contraseña" htmlFor="delete-password" required>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </FormField>
          <FormField label='Escribe "ELIMINAR" para confirmar' htmlFor="delete-confirm" required>
            <Input id="delete-confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
          </FormField>
          {deleteError ? <p className="text-sm text-orange-accent">{deleteError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={deleteAccount} disabled={busy || !deletePassword}>
              Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
