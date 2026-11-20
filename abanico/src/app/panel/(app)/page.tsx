import type { Metadata } from "next";
import Link from "next/link";
import { ScanIcon, WhatsAppIcon } from "@/components/icons";
import { Card, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatBirthday } from "@/lib/birthday";
import { INACTIVE_DAYS, getDashboardStats, getSettings, type Activity, type Settings } from "@/lib/loyalty";
import { whatsappLink } from "@/lib/phone";
import { timeAgo } from "@/lib/time";
import { baseUrl } from "@/lib/url";

export const metadata: Metadata = { title: "Inicio" };

const fmt = new Intl.NumberFormat("es-MX");
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function activityText(a: Activity): string {
  switch (a.type) {
    case "join":
      return "se registró";
    case "stamp":
      return a.amount === 1 ? "recibió 1 sello" : `recibió ${a.amount} sellos`;
    case "unstamp":
      return "perdió 1 sello (corrección)";
    case "reward_earned":
      return `ganó ${a.detail ?? "un premio"}`;
    case "reward_redeemed":
      return `canjeó ${a.detail ?? "un premio"}`;
    case "points_earned":
      return `sumó ${fmt.format(a.amount)} puntos`;
    case "points_redeemed":
      return `cambió ${fmt.format(a.amount)} puntos por ${a.detail ?? "un premio"}`;
    case "points_removed":
      return `perdió ${fmt.format(a.amount)} puntos (corrección)`;
  }
}

function nextLevelFor(stamps: number, settings: Settings) {
  return settings.levels.find((l) => l.at > stamps);
}

export default async function DashboardPage() {
  const staff = await requireStaff();
  const [stats, settings, url] = await Promise.all([getDashboardStats(), getSettings(), baseUrl()]);
  const maxVisits = Math.max(1, ...stats.daily.map((d) => d.visits));

  const tiles: { label: string; value: string; note?: string }[] = [
    { label: "Clientes", value: fmt.format(stats.customers), note: `+${stats.newCustomers7d} esta semana` },
    { label: "Visitas hoy", value: fmt.format(stats.visitsToday) },
    settings.stampsEnabled
      ? { label: "Sellos hoy", value: fmt.format(stats.stampsToday), note: `${fmt.format(stats.stamps7d)} en 7 días` }
      : null,
    settings.pointsEnabled
      ? {
          label: "Puntos en 7 días",
          value: fmt.format(stats.pointsGiven7d),
          note: stats.purchases7dCents > 0 ? `${money.format(stats.purchases7dCents / 100)} en compras` : undefined,
        }
      : null,
    { label: "Premios canjeados", value: fmt.format(stats.rewardsRedeemed30d), note: "últimos 30 días" },
    settings.stampsEnabled ? { label: "Premios por canjear", value: fmt.format(stats.rewardsPending) } : null,
    {
      label: "Clientes que regresan",
      value: stats.returningRate30d === null ? "—" : `${Math.round(stats.returningRate30d * 100)} %`,
      note: "vinieron 2+ días este mes",
    },
  ].filter((t): t is { label: string; value: string; note?: string } => t !== null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-tinta/55">Hola, {staff.name.split(" ")[0]}</p>
          <h1 className="text-3xl font-semibold">Así va {settings.businessName}</h1>
        </div>
        <Link href="/panel/sellar" className={buttonClass("primary", "lg", "hidden md:inline-flex")}>
          <ScanIcon className="h-5 w-5" /> Abrir caja
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Indicadores">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-papel px-4 py-4 ring-1 ring-tinta/10 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">{t.label}</p>
            <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums">{t.value}</p>
            {t.note ? <p className="mt-0.5 text-xs text-tinta/55">{t.note}</p> : null}
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <h2 className="font-sans text-lg font-bold">Clientes por día</h2>
          <p className="text-sm text-tinta/55">Últimos 14 días</p>
          <div className="mt-6 flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Gráfica de clientes atendidos por día">
            {stats.daily.map((d, i) => (
              <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] font-semibold tabular-nums text-tinta/60">{d.visits > 0 ? d.visits : ""}</span>
                <div
                  className={i === stats.daily.length - 1 ? "w-full rounded-t-md bg-terracota" : "w-full rounded-t-md bg-terracota/35"}
                  style={{ height: `${Math.max((d.visits / maxVisits) * 100, d.visits > 0 ? 4 : 1.5)}%` }}
                  title={`${d.label}: ${d.visits}`}
                />
                <span className="w-full truncate text-center text-[10px] text-tinta/50">{d.label.split(" ")[1] ?? d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-sans text-lg font-bold">Actividad reciente</h2>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-tinta/60">Todavía no hay movimientos. ¡Registra la primera compra en Caja!</p>
          ) : (
            <ul className="divide-y divide-tinta/10">
              {stats.recent.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <Link href={`/panel/clientes/${a.customerId}`} className="font-semibold hover:underline">
                      {a.customerName}
                    </Link>{" "}
                    <span className="text-tinta/70">{activityText(a)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-tinta/50">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {settings.stampsEnabled ? (
          <Card>
            <h2 className="font-sans text-lg font-bold">A punto de ganar</h2>
            <p className="mb-3 text-sm text-tinta/55">A 1 o 2 sellos de un premio</p>
            {stats.closeToReward.length === 0 ? (
              <p className="text-sm text-tinta/60">Nadie por ahora.</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.closeToReward.map((c) => {
                  const next = nextLevelFor(c.stamps, settings);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/panel/clientes/${c.id}`} className="min-w-0 truncate font-semibold hover:underline">
                        {c.name}
                      </Link>
                      <span className="shrink-0 text-tinta/60">
                        {next ? `${next.at - c.stamps} para ${next.title.toLowerCase()}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : null}

        <Card>
          <h2 className="font-sans text-lg font-bold">Mejores clientes</h2>
          <p className="mb-3 text-sm text-tinta/55">Por días de visita</p>
          {stats.topCustomers.length === 0 ? (
            <p className="text-sm text-tinta/60">Aún sin visitas.</p>
          ) : (
            <ol className="space-y-2.5">
              {stats.topCustomers.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 shrink-0 font-display font-semibold text-terracota">{i + 1}</span>
                  <Link href={`/panel/clientes/${c.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <span className="shrink-0 text-tinta/60">
                    {c.visitDays} {c.visitDays === 1 ? "visita" : "visitas"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <h2 className="font-sans text-lg font-bold">Hace tiempo que no vienen</h2>
          <p className="mb-3 text-sm text-tinta/55">Más de {INACTIVE_DAYS} días sin visitas. Mándales un mensaje.</p>
          {stats.inactive.length === 0 ? (
            <p className="text-sm text-tinta/60">Todos tus clientes han venido recientemente.</p>
          ) : (
            <ul className="space-y-2">
              {stats.inactive.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <Link href={`/panel/clientes/${c.id}`} className="block truncate font-semibold hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-xs text-tinta/50">{c.lastVisitAt ? timeAgo(c.lastVisitAt) : ""}</span>
                  </span>
                  <a
                    href={whatsappLink(
                      c.phone,
                      `¡Hola ${c.name.split(" ")[0]}! Te extrañamos en ${settings.businessName}. Tu tarjeta te espera: ${url}/tarjeta/${c.token}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("secondary", "sm", "shrink-0")}
                    aria-label={`Escribir a ${c.name} por WhatsApp`}
                  >
                    <WhatsAppIcon className="h-4 w-4" /> Escribir
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-sans text-lg font-bold">Cumpleaños del mes</h2>
          <p className="mb-3 text-sm text-tinta/55">Una buena excusa para consentirlos</p>
          {stats.birthdaysThisMonth.length === 0 ? (
            <p className="text-sm text-tinta/60">Nadie cumple años este mes.</p>
          ) : (
            <ul className="space-y-2">
              {stats.birthdaysThisMonth.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <Link href={`/panel/clientes/${c.id}`} className="block truncate font-semibold hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-xs text-tinta/50">{formatBirthday(c.birthday)}</span>
                  </span>
                  <a
                    href={whatsappLink(
                      c.phone,
                      `¡Feliz cumpleaños, ${c.name.split(" ")[0]}! En ${settings.businessName} queremos celebrarte. Te esperamos.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("secondary", "sm", "shrink-0")}
                    aria-label={`Felicitar a ${c.name} por WhatsApp`}
                  >
                    <WhatsAppIcon className="h-4 w-4" /> Felicitar
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
