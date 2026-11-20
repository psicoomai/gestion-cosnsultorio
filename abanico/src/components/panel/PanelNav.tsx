"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, QrIcon, ScanIcon, SettingsIcon, UsersIcon } from "@/components/icons";
import { cx } from "@/components/ui";

const items = [
  { href: "/panel", label: "Inicio", Icon: HomeIcon },
  { href: "/panel/sellar", label: "Caja", Icon: ScanIcon },
  { href: "/panel/clientes", label: "Clientes", Icon: UsersIcon },
  { href: "/panel/cartel", label: "QR", Icon: QrIcon },
  { href: "/panel/ajustes", label: "Ajustes", Icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/panel") return pathname === "/panel";
  if (href === "/panel/sellar") return pathname.startsWith("/panel/sellar") || pathname.startsWith("/panel/escaneo");
  return pathname.startsWith(href);
}

/** Navegación del panel: barra superior en escritorio y barra inferior en celular. */
export function PanelNav() {
  const pathname = usePathname() ?? "";
  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Panel">
        {items.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cx(
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              isActive(pathname, href) ? "bg-tinta text-papel" : "text-tinta/65 hover:bg-tinta/5 hover:text-tinta"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-tinta/10 bg-papel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Panel"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            const primary = href === "/panel/sellar";
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cx(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                    active ? "text-terracota" : "text-tinta/55"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cx(
                      "flex items-center justify-center",
                      primary ? "-mt-6 h-12 w-12 rounded-full bg-terracota text-papel shadow-lg ring-4 ring-crema" : "h-6 w-6"
                    )}
                  >
                    <Icon className={primary ? "h-6 w-6" : "h-6 w-6"} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
