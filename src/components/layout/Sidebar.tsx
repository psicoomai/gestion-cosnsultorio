"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { runChecks } from "@/lib/checks";

const links = [
  { href: "/", label: "Panel" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/sesiones", label: "Sesiones" },
  { href: "/cobros", label: "Cobros" },
  { href: "/totales", label: "Corte anual" },
  { href: "/revision", label: "Revisión" },
  { href: "/importar", label: "Importar Excel" },
  { href: "/ajustes", label: "Ajustes y respaldo" },
];

const saveLabels = {
  idle: "Guardado en este navegador",
  saving: "Guardando…",
  saved: "Guardado en este navegador",
  error: "No se pudo guardar — descarga un respaldo",
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const { profile, patients, sessions, payments, saveState } = useClinicData();

  // Solo cuenta lo que hay que revisar (no los adeudos, que ya se ven en Cobros).
  const reviewCount = useMemo(
    () => runChecks(patients, sessions, payments).filter((i) => i.severity === "atencion").length,
    [patients, sessions, payments]
  );

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-dark px-5 py-7">
      <Link href="/" className="mb-10 block">
        <span className="font-serif text-xl text-background">Consultorio</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {links.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors",
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

      <div className="border-t border-background/10 pt-4">
        <p className="text-xs text-background/70">{profile?.name}</p>
        {profile?.specialty ? <p className="text-xs text-background/40">{profile.specialty}</p> : null}
        <p
          className={cn(
            "mt-2 text-[11px]",
            saveState === "error" ? "text-orange-accent" : "text-background/30"
          )}
        >
          {saveLabels[saveState]}
        </p>
      </div>
    </aside>
  );
}
