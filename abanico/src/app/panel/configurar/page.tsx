import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/ui";
import { hasAnyStaff } from "@/lib/auth";
import { SetupForm } from "./SetupForm";

export const metadata: Metadata = { title: "Configuración inicial", robots: { index: false } };

export default async function SetupPage() {
  await connection();
  if (await hasAnyStaff()) redirect("/panel/entrar");
  const needsCode = Boolean(process.env.SETUP_CODE?.trim());
  const missingCode = process.env.NODE_ENV === "production" && !needsCode;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Logo name="Abanico" />
      <h1 className="mt-8 text-3xl font-semibold">Configura tu programa de lealtad</h1>
      <p className="mt-2 leading-relaxed text-cafe/65">
        Crea la cuenta de la dueña o dueño del negocio. Después podrás configurar los sellos, los puntos y dar de alta a tu
        equipo.
      </p>
      <div className="mt-8">
        {missingCode ? (
          <Notice tone="error">
            Por seguridad, define la variable de entorno <code className="font-mono">SETUP_CODE</code> en el servidor y vuelve
            a cargar esta página. Ese código se pedirá para crear la cuenta.
          </Notice>
        ) : (
          <SetupForm needsCode={needsCode} />
        )}
      </div>
    </main>
  );
}
