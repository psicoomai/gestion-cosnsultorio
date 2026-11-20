import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { CARD_COOKIE } from "@/lib/card-cookie";
import { getCustomerByToken, getSettings } from "@/lib/loyalty";
import { programSummary } from "@/lib/program-text";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "Obtén tu tarjeta" };

export default async function JoinPage() {
  const jar = await cookies();
  const saved = jar.get(CARD_COOKIE)?.value;
  if (saved && (await getCustomerByToken(saved))) redirect(`/tarjeta/${saved}`);

  const settings = await getSettings();
  const welcome =
    settings.stampsEnabled && settings.welcomeStamps > 0
      ? ` ¡Te regalamos ${settings.welcomeStamps === 1 ? "tu primer sello" : `${settings.welcomeStamps} sellos`} al registrarte!`
      : "";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Inicio">
          <Logo name={settings.businessName} />
        </Link>
      </header>
      <main className="flex-1 py-8">
        <h1 className="text-3xl font-semibold leading-tight">Tu tarjeta de lealtad</h1>
        <p className="mt-2 leading-relaxed text-tinta/70">
          {programSummary(settings)}
          {welcome}
        </p>
        <div className="mt-8">
          <JoinForm />
        </div>
      </main>
    </div>
  );
}
