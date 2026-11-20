import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PanelNav } from "@/components/panel/PanelNav";
import { logout } from "@/lib/actions/panel";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/loyalty";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const settings = await getSettings();

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="no-print sticky top-0 z-20 border-b border-tinta/10 bg-crema/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/panel" aria-label="Inicio del panel">
            <Logo name={settings.businessName} />
          </Link>
          <PanelNav />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-tinta/60 sm:inline">{staff.name}</span>
            <form action={logout}>
              <button type="submit" className="rounded-lg px-2 py-1 font-semibold text-tinta/60 hover:bg-tinta/5 hover:text-tinta">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
