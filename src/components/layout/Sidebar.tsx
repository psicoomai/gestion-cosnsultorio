"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { runChecks } from "@/lib/checks";

const links = [
  { href: "/", label: "Panel" },
  { href: "/agenda", label: "Agenda" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/sesiones", label: "Sesiones" },
  { href: "/cobros", label: "Cobros" },
  { href: "/totales", label: "Corte anual" },
  { href: "/revision", label: "Revisión" },
  { href: "/vacaciones", label: "Vacaciones" },
  { href: "/importar", label: "Importar Excel" },
  { href: "/ajustes", label: "Ajustes y respaldo" },
];

function saveLabel(state: string, storage: "cuenta" | "navegador"): string {
  if (state === "saving") return "Guardando…";
  if (state === "error") return "No se pudo guardar. Revisa tu conexión o descarga un respaldo.";
  if (state === "conflict") return "Hay cambios más recientes desde otro dispositivo. Recarga la página.";
  return storage === "cuenta" ? "Guardado en tu cuenta" : "Guardado en este navegador";
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, patients, sessions, payments, vacations, saveState, storage } = useClinicData();
  const auth = useAuth();

  // Solo cuenta lo que hay que revisar (no los adeudos, que ya se ven en Cobros).
  const reviewCount = useMemo(
    () => runChecks(patients, sessions, payments, new Date(), vacations).filter((i) => i.severity === "atencion").length,
    [patients, sessions, payments, vacations]
  );

  return (
    <aside className="bg-dark px-4 py-3 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:px-5 md:py-7">
      <div className="mb-2 flex items-center justify-between md:mb-10">
        <Link href="/" className="block">
          <span className="font-serif text-xl text-background">Consultorio</span>
        </Link>
        {auth?.user ? (
          <button
            type="button"
            onClick={() => void auth.logout()}
            className="text-xs text-background/70 hover:text-background md:hidden"
          >
            Salir
          </button>
        ) : null}
      </div>

      <nav className="-mx-1 flex gap-0.5 overflow-x-auto pb-1 md:mx-0 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
        {links.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-sm px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-background/10 text-background"
                  : "text-background/60 hover:bg-background/[0.06] hover:text-background/90"
              )}
            >
              {link.label}
              {link.href === "/revision" && reviewCount > 0 ? (
                <span className="rounded-sm bg-orange-accent px-1.5 text-xs font-semibold text-background">
                  {reviewCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-background/10 pt-4 md:block">
        <p className="text-xs text-background/70">{profile?.name}</p>
        {profile?.specialty ? <p className="text-xs text-background/40">{profile.specialty}</p> : null}
        <p
          className={cn(
            "mt-2 text-[11px]",
            saveState === "error" || saveState === "conflict" ? "text-orange-accent" : "text-background/30"
          )}
        >
          {saveLabel(saveState, storage)}
        </p>
        {auth?.user ? (
          <div className="mt-3 border-t border-background/10 pt-3">
            <p className="truncate text-[11px] text-background/40" title={auth.user.email}>
              {auth.user.email}
            </p>
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="mt-1 text-xs text-background/70 hover:text-background"
            >
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
