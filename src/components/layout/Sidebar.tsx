"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Panel" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/sesiones", label: "Sesiones" },
  { href: "/cobros", label: "Cobros" },
  { href: "/guia-estilo", label: "Guía de estilo" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-dark px-5 py-7">
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
                "rounded-sm px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-background/10 text-background"
                  : "text-background/60 hover:bg-background/[0.06] hover:text-background/90"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-background/10 pt-4">
        <p className="text-xs text-background/45">Dra. Ana Beltrán</p>
        <p className="text-xs text-background/30">Psicología clínica</p>
      </div>
    </aside>
  );
}
