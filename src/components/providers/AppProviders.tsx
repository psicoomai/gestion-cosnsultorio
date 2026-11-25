"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { ClinicDataProvider } from "@/components/providers/ClinicDataProvider";
import { createApiStore } from "@/lib/api-store";
import { LOCAL_ONLY } from "@/lib/runtime-mode";

/** Páginas que se ven sin iniciar sesión. */
const PUBLIC_PATHS = ["/privacidad"];

function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth()!;
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
  const sessionLost = auth.sessionLost;
  const store = useMemo(() => createApiStore(sessionLost), [sessionLost]);

  if (isPublic) return <>{children}</>;
  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-dark/50">Cargando…</p>
      </div>
    );
  }
  if (auth.status === "anon" || !auth.user) return <AuthScreen />;

  return (
    <ClinicDataProvider
      key={auth.user.id}
      store={store}
      suggestedProfile={{ name: auth.user.name, specialty: auth.user.specialty ?? undefined }}
    >
      {children}
    </ClinicDataProvider>
  );
}

/**
 * Con servidor: cada persona entra con su cuenta y sus datos viven en ella.
 * En la versión de prueba (LOCAL_ONLY): sin cuentas, datos en el navegador.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  if (LOCAL_ONLY) return <ClinicDataProvider>{children}</ClinicDataProvider>;
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
