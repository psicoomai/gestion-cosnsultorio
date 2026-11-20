import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PointsCard } from "@/components/PointsCard";
import { StampCard } from "@/components/StampCard";
import { buttonClass } from "@/components/ui";
import { CARD_COOKIE } from "@/lib/card-cookie";
import { getCustomerByToken, getSettings } from "@/lib/loyalty";
import { programSummary } from "@/lib/program-text";

export default async function HomePage() {
  const jar = await cookies();
  const saved = jar.get(CARD_COOKIE)?.value;
  if (saved && (await getCustomerByToken(saved))) redirect(`/tarjeta/${saved}`);

  const settings = await getSettings();
  const firstLevel = settings.levels[0];
  const demoStamps = firstLevel ? Math.max(1, firstLevel.at - 1) : 0;
  const demoPoints = settings.catalog[0] ? Math.round(settings.catalog[0].cost * 0.7) : 70;

  const steps: [string, string, string][] = [
    ["1", "Regístrate", "Con tu nombre y tu celular. Tarda menos de un minuto."],
    [
      "2",
      "Muestra tu código",
      settings.stampsEnabled
        ? "En cada compra, el equipo escanea tu tarjeta y el sello aparece al instante."
        : "En cada compra, el equipo escanea tu tarjeta y tus puntos aparecen al instante.",
    ],
    ["3", "Disfruta tus premios", "Cuando llegues a un premio, lo canjeas en caja mostrando tu tarjeta."],
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Logo name={settings.businessName} />
        <Link href="/panel" className="text-sm font-medium text-tinta/60 hover:text-tinta">
          Equipo
        </Link>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-12 py-8 md:flex-row md:items-center md:gap-16 md:py-16">
        <section className="animate-float-up md:max-w-md md:flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-terracota">Programa de lealtad</p>
          <h1 className="mt-3 text-[2.6rem] font-semibold leading-[1.05] sm:text-5xl">
            Cada visita <span className="italic text-terracota">suma</span>.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-tinta/70">
            {programSummary(settings)} Tu tarjeta vive en tu celular: sin app y sin cartón que se pierde.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/unirse" className={buttonClass("primary", "lg")}>
              Obtener mi tarjeta
            </Link>
          </div>
          <p className="mt-4 text-sm text-tinta/55">
            ¿Ya tienes tarjeta en otro celular? Pide en caja que te la manden por WhatsApp.
          </p>
        </section>

        <section className="space-y-5 md:flex-1" aria-label="Ejemplo de tarjeta">
          {settings.stampsEnabled ? (
            <div className="mx-auto max-w-sm rotate-[-2deg] transition hover:rotate-0">
              <StampCard
                businessName={settings.businessName}
                customerName="Así se ve tu tarjeta"
                stamps={demoStamps}
                levels={settings.levels}
              />
            </div>
          ) : null}
          {settings.pointsEnabled ? (
            <div className="mx-auto max-w-sm rotate-[1.5deg] transition hover:rotate-0">
              <PointsCard
                points={demoPoints}
                earnAmount={settings.earnAmount}
                earnPoints={settings.earnPoints}
                catalog={settings.catalog.slice(0, 3)}
              />
            </div>
          ) : null}
        </section>
      </main>

      <section className="grid gap-4 border-t border-tinta/10 py-10 sm:grid-cols-3">
        {steps.map(([n, title, body]) => (
          <div key={n} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracota/10 font-display text-lg font-semibold text-terracota">
              {n}
            </span>
            <div>
              <h2 className="font-sans text-base font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-tinta/65">{body}</p>
            </div>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-tinta/10 py-6 text-xs text-tinta/50">
        <p>
          © {new Date().getFullYear()} {settings.businessName}
        </p>
        <Link href="/privacidad" className="hover:text-tinta">
          Aviso de privacidad
        </Link>
      </footer>
    </div>
  );
}
