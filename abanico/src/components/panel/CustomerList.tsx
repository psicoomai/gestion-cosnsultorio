import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatCardCode } from "@/lib/card-code";
import type { Customer, Settings } from "@/lib/loyalty";
import { formatPhone } from "@/lib/phone";
import { timeAgo } from "@/lib/time";

const fmt = new Intl.NumberFormat("es-MX");

export function CustomerList({
  customers,
  settings,
  pendingByCustomer,
}: {
  customers: Customer[];
  settings: Settings;
  pendingByCustomer?: Map<number, number>;
}) {
  return (
    <ul className="divide-y divide-tinta/10 overflow-hidden rounded-2xl bg-papel ring-1 ring-tinta/10">
      {customers.map((c) => {
        const pending = pendingByCustomer?.get(c.id) ?? 0;
        return (
          <li key={c.id}>
            <Link href={`/panel/clientes/${c.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-arena/40 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracota/10 font-display text-lg font-semibold text-terracota">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  {pending > 0 ? <Badge tone="reward">{pending === 1 ? "1 premio" : `${pending} premios`}</Badge> : null}
                </span>
                <span className="block truncate text-sm text-tinta/55">
                  {formatPhone(c.phone)} · {formatCardCode(c.code)}
                  {c.lastVisitAt ? ` · ${timeAgo(c.lastVisitAt)}` : " · sin visitas"}
                </span>
              </span>
              <span className="shrink-0 text-right text-sm tabular-nums">
                {settings.stampsEnabled ? (
                  <span className="block font-semibold">
                    {Math.min(c.stamps, settings.cardLength)}/{settings.cardLength} <span className="font-normal text-tinta/50">sellos</span>
                  </span>
                ) : null}
                {settings.pointsEnabled ? (
                  <span className="block text-tinta/65">{fmt.format(c.points)} pts</span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
