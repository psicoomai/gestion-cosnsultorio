"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Welcome } from "@/components/onboarding/Welcome";
import { useClinicData } from "@/components/providers/ClinicDataProvider";

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { hydrated, profile } = useClinicData();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-dark/50">Cargando tus datos…</p>
      </div>
    );
  }

  if (!profile) return <Welcome />;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar title={title} description={description} actions={actions} />
        <main className="px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
