"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { useClinicData } from "@/components/providers/ClinicDataProvider";

type Start = "importar" | "vacio" | "ejemplo";

/**
 * Primera pantalla para quien abre la plataforma por primera vez: nombre
 * (para la barra lateral) y cómo empezar. Los datos se guardan solo en este
 * navegador — se dice explícitamente para que nadie asuma que hay una nube.
 */
export function Welcome() {
  const { setProfile, loadExampleData, suggestedProfile, storage } = useClinicData();
  const router = useRouter();
  const [name, setName] = useState(suggestedProfile?.name ?? "");
  const [specialty, setSpecialty] = useState(suggestedProfile?.specialty ?? "");
  const [error, setError] = useState<string | null>(null);

  function start(e: FormEvent, how: Start) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Escribe tu nombre para continuar.");
      return;
    }
    if (how === "ejemplo") loadExampleData();
    setProfile({ name: name.trim(), specialty: specialty.trim() || undefined });
    router.push(how === "importar" ? "/importar" : how === "ejemplo" ? "/" : "/pacientes");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <form className="w-full max-w-xl" onSubmit={(e) => start(e, "vacio")}>
        <p className="text-xs font-semibold uppercase tracking-wideish text-dark/50">Consultorio</p>
        <h1 className="mt-2 font-serif text-3xl text-dark">Tus pacientes, sesiones y cobros, siempre cuadrados</h1>
        <p className="mt-3 text-sm leading-relaxed text-dark/70">
          Registra cada sesión y cada pago una sola vez. Los totales por mes, por paciente y del año se
          calculan solos, y la sección Revisión te avisa de pagos duplicados, fechas mal escritas o dinero
          que no entró en los totales.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Tu nombre" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Psic. Ana López" autoFocus />
          </FormField>
          <FormField label="Especialidad (opcional)">
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Psicología clínica" />
          </FormField>
        </div>
        {error ? <p className="mt-2 text-sm text-orange-accent">{error}</p> : null}

        <p className="mt-8 text-xs font-semibold uppercase tracking-wideish text-dark/55">¿Cómo quieres empezar?</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button type="button" className="!h-12 !justify-start text-base" onClick={(e) => start(e, "importar")}>
            Importar mi Excel de pagos
          </Button>
          <Button type="submit" variant="secondary" className="!h-12 !justify-start text-base">
            Empezar desde cero
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="!h-12 !justify-start text-base"
            onClick={(e) => start(e, "ejemplo")}
          >
            Explorar con datos de ejemplo
          </Button>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-dark/50">
          {storage === "cuenta"
            ? "Tus datos se guardan cifrados en tu cuenta y solo tú puedes verlos. Puedes entrar desde cualquier dispositivo y descargar un respaldo cuando quieras desde Ajustes."
            : "Tus datos se guardan únicamente en este navegador, en este dispositivo: no se envían a ningún servidor. Descarga un respaldo de vez en cuando desde Ajustes."}
        </p>
      </form>
    </div>
  );
}
