import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ScanIcon, WhatsAppIcon } from "@/components/icons";
import { CopyButton, DeleteCustomerForm, EditCustomerForm, RemovePointsForm } from "@/components/panel/CustomerForms";
import { RedeemSection } from "@/components/panel/RedeemSection";
import { VisitForm } from "@/components/panel/VisitForm";
import { StampCard } from "@/components/StampCard";
import { Badge, Card, Notice, buttonClass } from "@/components/ui";
import { unstampAction } from "@/lib/actions/panel";
import { requireStaff } from "@/lib/auth";
import { formatBirthday, splitBirthday } from "@/lib/birthday";
import { formatCardCode } from "@/lib/card-code";
import { getCustomerActivity, getCustomerById, getRewards, getSettings, type Activity } from "@/lib/loyalty";
import { formatMoney } from "@/lib/money";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { formatDate, formatDateTime, timeAgo } from "@/lib/time";
import { cardUrl } from "@/lib/url";

export const metadata: Metadata = { title: "Cliente" };

const fmt = new Intl.NumberFormat("es-MX");
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function describe(a: Activity): string {
  switch (a.type) {
    case "join":
      return "Se registró";
    case "stamp":
      return a.amount === 1 ? "+1 sello" : `+${a.amount} sellos`;
    case "unstamp":
      return "−1 sello (corrección)";
    case "reward_earned":
      return `Ganó: ${a.detail ?? "premio"}`;
    case "reward_redeemed":
      return `Canjeó: ${a.detail ?? "premio"}`;
    case "points_earned":
      return `+${fmt.format(a.amount)} pts${a.purchaseCents ? ` · compra de ${money.format(a.purchaseCents / 100)}` : ""}`;
    case "points_redeemed":
      return `Canjeó con puntos: ${a.detail ?? "premio"} (−${fmt.format(a.amount)} pts)`;
    case "points_removed":
      return `−${fmt.format(a.amount)} pts (corrección)`;
    case "credit_earned":
      return `+${formatMoney(a.amount)} de saldo${a.purchaseCents ? ` · compra de ${money.format(a.purchaseCents / 100)}` : ""}`;
    case "credit_used":
      return `Usó ${formatMoney(a.amount)} de saldo`;
  }
}

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ escaneo?: string }>;
}) {
  const staff = await requireStaff();
  const { id } = await params;
  const { escaneo } = await searchParams;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();
  const customer = await getCustomerById(customerId);
  if (!customer) notFound();

  const [settings, rewards, activity, url] = await Promise.all([
    getSettings(),
    getRewards(customer.id),
    getCustomerActivity(customer.id, 40),
    cardUrl(customer.token),
  ]);
  const pending = rewards.filter((r) => r.source === "stamps" && r.redeemedAt === null);
  const verified = escaneo === "1";
  const firstName = customer.name.split(" ")[0];
  const shareMessage = `Hola ${firstName}, esta es tu tarjeta de lealtad de ${settings.businessName}: ${url}`;
  const birthday = splitBirthday(customer.birthday);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/panel/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-cafe/60 hover:text-cafe">
          <ArrowLeftIcon className="h-4 w-4" /> Clientes
        </Link>
        <Link href="/panel/sellar" className={buttonClass("secondary", "sm")}>
          <ScanIcon className="h-4 w-4" /> Escanear otra tarjeta
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{customer.name}</h1>
          <p className="mt-1 text-cafe/60">
            {formatPhone(customer.phone)} · Tarjeta {formatCardCode(customer.code)}
            {customer.birthday ? ` · Cumple el ${formatBirthday(customer.birthday)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {verified ? <Badge tone="success">Tarjeta escaneada</Badge> : null}
          {pending.length > 0 ? <Badge tone="reward">{pending.length === 1 ? "1 premio por canjear" : `${pending.length} premios por canjear`}</Badge> : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-sans text-lg font-bold">Registrar compra</h2>
            <p className="mb-4 mt-1 text-sm text-cafe/60">
              {customer.lastVisitAt ? `Última visita ${timeAgo(customer.lastVisitAt)}.` : "Primera compra."}
            </p>
            <VisitForm
              customerId={customer.id}
              stampsEnabled={settings.stampsEnabled}
              pointsEnabled={settings.pointsEnabled}
              earnAmount={settings.earnAmount}
              earnPoints={settings.earnPoints}
              cashbackEnabled={settings.cashbackEnabled}
              cashbackPercent={settings.cashbackPercent}
            />
          </Card>

          {pending.length > 0 || settings.pointsEnabled || settings.cashbackEnabled ? (
            <Card>
              <h2 className="mb-4 font-sans text-lg font-bold">Premios</h2>
              {pending.length === 0 &&
              (!settings.pointsEnabled || settings.catalog.length === 0) &&
              !settings.cashbackEnabled ? (
                <p className="text-sm text-cafe/60">Sin premios por canjear.</p>
              ) : (
                <RedeemSection
                  customerId={customer.id}
                  verified={verified}
                  pending={pending.map((r) => ({ id: r.id, title: r.title, earnedAt: formatDate(r.earnedAt) }))}
                  catalog={settings.catalog.map(({ id, title, cost }) => ({ id, title, cost }))}
                  points={customer.points}
                  pointsEnabled={settings.pointsEnabled}
                  cashbackEnabled={settings.cashbackEnabled}
                  creditCents={customer.creditCents}
                />
              )}
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {settings.stampsEnabled ? (
            <StampCard
              businessName={settings.businessName}
              customerName={customer.name}
              stamps={customer.stamps}
              required={settings.stampsRequired}
              rewardTitle={settings.rewardTitle}
            />
          ) : null}

          <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              settings.pointsEnabled ? ["Puntos", fmt.format(customer.points)] : null,
              settings.cashbackEnabled ? ["Saldo a favor", formatMoney(customer.creditCents)] : null,
              settings.stampsEnabled ? ["Sellos totales", fmt.format(customer.totalStamps)] : null,
              ["Premios canjeados", fmt.format(rewards.filter((r) => r.redeemedAt !== null).length)],
              ["Cliente desde", formatDate(customer.createdAt)],
            ]
              .filter((x): x is string[] => x !== null)
              .map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cafe/50">{label}</p>
                  <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
          </Card>

          <Card className="space-y-3">
            <h2 className="font-sans text-lg font-bold">Enviar su tarjeta</h2>
            <p className="text-sm text-cafe/60">
              Si cambió de celular o perdió el enlace, mándale su tarjeta. Al abrirla, se guarda en su teléfono.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={whatsappLink(customer.phone, shareMessage)} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
                <WhatsAppIcon className="h-5 w-5" /> WhatsApp
              </a>
              <CopyButton text={url} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-sans text-lg font-bold">Historial</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-cafe/60">Sin movimientos.</p>
          ) : (
            <ul className="divide-y divide-cafe/10">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                  <span>
                    <span className={a.type.startsWith("reward") || a.type === "points_redeemed" ? "font-semibold" : ""}>{describe(a)}</span>
                    {a.staffName ? <span className="block text-xs text-cafe/50">por {a.staffName}</span> : null}
                  </span>
                  <span className="shrink-0 text-cafe/50">{formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-sans text-lg font-bold">Datos del cliente</h2>
            <EditCustomerForm
              customerId={customer.id}
              name={customer.name}
              phone={customer.phone}
              day={birthday.day}
              month={birthday.month}
            />
          </Card>

          <Card className="space-y-4">
            <h2 className="font-sans text-lg font-bold">Correcciones</h2>
            {settings.stampsEnabled ? (
              <form action={unstampAction} className="flex items-center justify-between gap-3">
                <input type="hidden" name="customerId" value={customer.id} />
                <p className="text-sm text-cafe/70">¿Diste un sello de más? Quita uno de la tarjeta actual.</p>
                <button type="submit" className={buttonClass("danger", "sm")} disabled={customer.stamps <= 0}>
                  Quitar 1 sello
                </button>
              </form>
            ) : null}
            {settings.pointsEnabled ? <RemovePointsForm customerId={customer.id} points={customer.points} /> : null}
            {staff.role === "owner" ? (
              <div className="border-t border-cafe/10 pt-4">
                <DeleteCustomerForm customerId={customer.id} name={customer.name} />
              </div>
            ) : (
              <Notice>Solo la dueña o el dueño del negocio puede borrar clientes.</Notice>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
