"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { downloadBlob } from "@/lib/download";
import { todayIso } from "@/lib/format";
import { parseSnapshot } from "@/lib/storage";

export default function AjustesPage() {
  const data = useClinicData();
  const { profile, setProfile, patients, sessions, payments } = data;
  const [name, setName] = useState(profile?.name ?? "");
  const [specialty, setSpecialty] = useState(profile?.specialty ?? "");
  const [message, setMessage] = useState<{ tone: "info" | "accent"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<"restaurar" | "ejemplo" | "borrar" | null>(null);
  const [pendingRestore, setPendingRestore] = useState<ReturnType<typeof parseSnapshot> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ tone: "accent", text: "El nombre no puede quedar vacío." });
      return;
    }
    setProfile({ name: name.trim(), specialty: specialty.trim() || undefined });
    setMessage({ tone: "info", text: "Perfil actualizado." });
  }

  function downloadBackup() {
    const snapshot = data.exportSnapshot();
    downloadBlob(
      new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
      `respaldo-consultorio-${todayIso()}.json`
    );
  }

  async function readBackup(file: File) {
    try {
      const snapshot = parseSnapshot(JSON.parse(await file.text()));
      setPendingRestore(snapshot);
      setConfirm("restaurar");
    } catch (err) {
      setMessage({
        tone: "accent",
        text: err instanceof Error ? err.message : "No se pudo leer el archivo de respaldo.",
      });
    }
  }

  return (
    <AppShell title="Ajustes y respaldo" description="Tu perfil y la copia de seguridad de tus datos.">
      <div className="grid max-w-4xl grid-cols-1 gap-6">
        {message ? <Alert variant={message.tone} title={message.text} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 items-end gap-4">
              <FormField label="Nombre" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Especialidad">
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit">Guardar perfil</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Respaldo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-0 text-sm text-dark/75">
            <p>
              Tus datos ({patients.length} pacientes, {sessions.length} sesiones, {payments.length} pagos) se
              guardan solo en este navegador. Si borras los datos del navegador o cambias de computadora, se
              pierden: descarga un respaldo con frecuencia y guárdalo en un lugar seguro.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadBackup}>Descargar respaldo (.json)</Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                Restaurar un respaldo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readBackup(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-xs text-dark/50">
              ¿Quieres una copia en Excel con tus totales por mes? Descárgala desde{" "}
              <Link href="/totales" className="text-blue-accent">
                Corte anual
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empezar de nuevo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Button variant="secondary" onClick={() => setConfirm("ejemplo")}>
              Cargar datos de ejemplo
            </Button>
            <Button variant="secondary" onClick={() => setConfirm("borrar")}>
              Borrar todos mis datos
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmModal
        open={confirm === "restaurar"}
        title="¿Restaurar este respaldo?"
        message={`Se reemplazarán tus datos actuales por los del respaldo (${pendingRestore?.patients.length ?? 0} pacientes, ${pendingRestore?.sessions.length ?? 0} sesiones, ${pendingRestore?.payments.length ?? 0} pagos). Si no tienes un respaldo de lo actual, descárgalo antes.`}
        confirmLabel="Restaurar"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!pendingRestore) return;
          data.replaceData(pendingRestore);
          if (pendingRestore.profile) setProfile(pendingRestore.profile);
          setMessage({ tone: "info", text: "Respaldo restaurado." });
        }}
      />
      <ConfirmModal
        open={confirm === "ejemplo"}
        title="¿Cargar datos de ejemplo?"
        message="Se reemplazarán tus pacientes, sesiones y pagos actuales por datos ficticios de ejemplo."
        confirmLabel="Cargar ejemplo"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          data.loadExampleData();
          setMessage({ tone: "info", text: "Datos de ejemplo cargados." });
        }}
      />
      <ConfirmModal
        open={confirm === "borrar"}
        title="¿Borrar todos tus datos?"
        message="Se borrarán tu perfil, pacientes, sesiones y pagos de este navegador. No se puede deshacer."
        confirmLabel="Borrar todo"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          void data.resetAll();
        }}
      />
    </AppShell>
  );
}
