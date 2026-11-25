"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/cn";

type Mode = "entrar" | "registro";

/** Entrar o crear cuenta. Cada cuenta tiene su propio consultorio, privado. */
export function AuthScreen() {
  const auth = useAuth()!;
  const [mode, setMode] = useState<Mode>("entrar");
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "registro" && !acceptPrivacy) {
      setError("Para crear tu cuenta debes aceptar el aviso de privacidad.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "entrar") await auth.login(email, password);
      else await auth.register({ name, specialty, email, password, acceptPrivacy });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-wideish text-dark/50">Consultorio</p>
        <h1 className="mt-2 font-serif text-3xl text-dark">
          {mode === "entrar" ? "Entra a tu consultorio" : "Crea tu cuenta"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-dark/65">
          Pacientes, sesiones y cobros que siempre cuadran. Cada cuenta ve solo su propia consulta, y los datos se
          guardan cifrados.
        </p>

        <div className="mt-6 flex gap-1 border-b border-dark/10">
          {(
            [
              ["entrar", "Iniciar sesión"],
              ["registro", "Crear cuenta"],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                mode === value ? "border-blue-accent text-dark" : "border-transparent text-dark/50 hover:text-dark"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {mode === "registro" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Tu nombre" htmlFor="auth-name" required>
                <Input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Psic. Ana López"
                  autoComplete="name"
                />
              </FormField>
              <FormField label="Especialidad" htmlFor="auth-specialty">
                <Input
                  id="auth-specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Psicología clínica"
                />
              </FormField>
            </div>
          ) : null}
          <FormField label="Correo" htmlFor="auth-email" required>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="tu@correo.com"
            />
          </FormField>
          <FormField
            label="Contraseña"
            htmlFor="auth-password"
            required
            hint={mode === "registro" ? "Mínimo 8 caracteres. Guárdala bien: todavía no hay recuperación por correo." : undefined}
          >
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            />
          </FormField>
          {mode === "registro" ? (
            <label className="flex items-start gap-2 text-sm text-dark/75">
              <Checkbox
                id="auth-privacy"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Leí y acepto el{" "}
                <a href="/privacidad" target="_blank" rel="noreferrer" className="text-blue-accent">
                  aviso de privacidad
                </a>
                .
              </span>
            </label>
          ) : null}
          {error ? <p className="text-sm text-orange-accent">{error}</p> : null}
          <Button type="submit" disabled={busy} className="!h-11">
            {busy ? "Un momento…" : mode === "entrar" ? "Entrar" : "Crear mi cuenta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
