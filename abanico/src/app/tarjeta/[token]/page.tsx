import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { InstallHint } from "@/components/InstallHint";
import { Logo } from "@/components/Logo";
import { PointsCard } from "@/components/PointsCard";
import { RememberCard } from "@/components/RememberCard";
import { StampCard } from "@/components/StampCard";
import { GiftIcon } from "@/components/icons";
import { Notice } from "@/components/ui";
import { forgetCard } from "@/lib/actions/public";
import { formatCardCode } from "@/lib/codes";
import { getCustomerActivity, getCustomerByToken, getRewards, getSettings, type Activity } from "@/lib/loyalty";
import { qrSvg } from "@/lib/qr";
import { formatDateTime } from "@/lib/time";
import { cardUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "Mi tarjeta",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const fmt = new Intl.NumberFormat("es-MX");

function historyText(a: Activity): string | null {
  switch (a.type) {
    case "join":
      return "Te uniste al programa";
    case "stamp":
      return a.amount === 1 ? "+1 sello" : `+${a.amount} sellos`;
    case "unstamp":
      return "Se corrigió un sello";
    case "reward_earned":
      return `¡Ganaste ${a.detail ?? "un premio"}!`;
    case "reward_redeemed":
      return `Canjeaste ${a.detail ?? "tu premio"}`;
    case "points_earned":
      return `+${fmt.format(a.amount)} puntos`;
    case "points_redeemed":
      return `${a.detail ?? "Premio"} · −${fmt.format(a.amount)} puntos`;
    case "points_removed":
      return `Se corrigieron ${fmt.format(a.amount)} puntos`;
    default:
      return null;
  }
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const { token } = await params;
  const { bienvenida } = await searchParams;
  const customer = await getCustomerByToken(token);
  if (!customer) notFound();

  const [settings, rewards, activity, url] = await Promise.all([
    getSettings(),
    getRewards(customer.id),
    getCustomerActivity(customer.id, 12),
    cardUrl(token),
  ]);
  const available = rewards.filter((r) => r.source === "stamps" && r.redeemedAt === null);
  const redeemedCount = rewards.filter((r) => r.redeemedAt !== null).length;
  const affordable = settings.pointsEnabled ? settings.catalog.filter((item) => customer.points >= item.cost) : [];
  const svg = await qrSvg(url);
  const firstName = customer.name.split(" ")[0];

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-12 pt-5">
      <AutoRefresh intervalMs={5000} />
      <RememberCard token={token} />

      <header className="flex items-center justify-between">
        <Logo name={settings.businessName} />
        <p className="text-sm text-cafe/60">Hola, {firstName}</p>
      </header>

      <main className="mt-6 space-y-5">
        {bienvenida ? (
          <Notice tone="success" className="animate-float-up">
            <strong>¡Listo, {firstName}!</strong> Esta es tu tarjeta. Muestra tu código en caja en cada compra para recibir
            tus sellos.
          </Notice>
        ) : null}

        {available.length > 0 || affordable.length > 0 ? (
          <section className="animate-glow rounded-[1.6rem] bg-limon px-5 py-5 text-cafe">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-papel/60">
                <GiftIcon className="h-6 w-6" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cafe/70">
                {available.length > 0
                  ? available.length === 1
                    ? "Tienes un premio esperándote"
                    : `Tienes ${available.length} premios esperándote`
                  : "Ya te alcanzan tus puntos"}
              </p>
            </div>
            <ul className="mt-3 space-y-1">
              {available.map((r) => (
                <li key={r.id} className="font-display text-xl font-semibold leading-snug">
                  {r.title}
                </li>
              ))}
              {affordable.map((item) => (
                <li key={`p${item.id}`} className="font-display text-lg leading-snug">
                  {item.title} <span className="font-sans text-sm text-cafe/70">· {fmt.format(item.cost)} pts</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-cafe/80">
              Pídelo en caja mostrando tu código. Código de validación:{" "}
              <strong className="font-mono tracking-wider">{formatCardCode(customer.code)}</strong>
            </p>
          </section>
        ) : null}

        {settings.stampsEnabled ? (
          <StampCard
            businessName={settings.businessName}
            customerName={customer.name}
            stamps={customer.stamps}
            required={settings.stampsRequired}
            rewardTitle={settings.rewardTitle}
          />
        ) : null}

        {settings.pointsEnabled ? (
          <PointsCard
            points={customer.points}
            earnAmount={settings.earnAmount}
            earnPoints={settings.earnPoints}
            catalog={settings.catalog}
          />
        ) : null}

        <section className="rounded-[1.6rem] bg-papel px-5 py-6 text-center ring-1 ring-cafe/10" aria-labelledby="qr-title">
          <h2 id="qr-title" className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-cafe/60">
            Muestra este código en caja
          </h2>
          <div
            className="mx-auto mt-4 aspect-square w-full max-w-[15rem] rounded-2xl bg-white p-3 ring-1 ring-cafe/10 [&_svg]:h-full [&_svg]:w-full"
            role="img"
            aria-label="Código QR de tu tarjeta"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="mt-4 text-xs text-cafe/55">Código de tarjeta</p>
          <p className="font-mono text-2xl font-semibold tracking-[0.2em]">{formatCardCode(customer.code)}</p>
        </section>

        <InstallHint />

        {activity.length > 0 ? (
          <section aria-labelledby="history-title">
            <h2 id="history-title" className="mb-2 px-1 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-cafe/60">
              Tus visitas
            </h2>
            <ul className="divide-y divide-cafe/10 rounded-2xl bg-papel px-5 ring-1 ring-cafe/10">
              {activity.map((a) => {
                const text = historyText(a);
                if (!text) return null;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span className={a.type === "reward_earned" || a.type === "reward_redeemed" ? "font-semibold" : ""}>
                      {text}
                    </span>
                    <span className="shrink-0 text-cafe/50">{formatDateTime(a.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 px-1 text-xs text-cafe/50">
              {[
                settings.stampsEnabled ? `${customer.totalStamps} ${customer.totalStamps === 1 ? "sello" : "sellos"} en total` : null,
                settings.pointsEnabled ? `${fmt.format(customer.totalPoints)} puntos ganados` : null,
                redeemedCount > 0 ? `${redeemedCount} ${redeemedCount === 1 ? "premio canjeado" : "premios canjeados"}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </section>
        ) : null}

        <section className="rounded-2xl px-1 text-xs leading-relaxed text-cafe/55">
          <p>
            <strong className="text-cafe/70">Condiciones:</strong> {settings.rewardTerms}
          </p>
        </section>
      </main>

      <footer className="mt-10 flex items-center justify-between gap-4 border-t border-cafe/10 pt-5 text-xs text-cafe/50">
        <Link href="/privacidad" className="hover:text-cafe">
          Aviso de privacidad
        </Link>
        <form action={forgetCard}>
          <button type="submit" className="hover:text-cafe">
            ¿No es tu tarjeta? Salir
          </button>
        </form>
      </footer>
    </div>
  );
}
