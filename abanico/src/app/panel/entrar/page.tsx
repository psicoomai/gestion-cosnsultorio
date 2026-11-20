import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getCurrentStaff, hasAnyStaff } from "@/lib/auth";
import { getSettings } from "@/lib/loyalty";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage() {
  await connection();
  if (!(await hasAnyStaff())) redirect("/panel/configurar");
  if (await getCurrentStaff()) redirect("/panel");
  const settings = await getSettings();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <Logo name={settings.businessName} />
      <h1 className="mt-8 text-3xl font-semibold">Panel del equipo</h1>
      <p className="mt-2 text-tinta/65">Entra para dar sellos, sumar puntos y canjear premios.</p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
