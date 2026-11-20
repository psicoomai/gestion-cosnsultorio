import type { Metadata } from "next";
import Link from "next/link";
import { CustomerList } from "@/components/panel/CustomerList";
import { Button, Input, Notice, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db, num } from "@/lib/db";
import { countCustomers, getSettings, searchCustomers } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Clientes" };

const PAGE_SIZE = 50;

async function pendingRewardsMap(ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();
  const client = await db();
  const result = await client.execute({
    sql: `SELECT customer_id, COUNT(*) AS n FROM rewards
          WHERE source = 'stamps' AND redeemed_at IS NULL AND customer_id IN (${ids.map(() => "?").join(",")})
          GROUP BY customer_id`,
    args: ids,
  });
  return new Map(result.rows.map((r) => [num(r.customer_id), num(r.n)]));
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; borrado?: string }>;
}) {
  const staff = await requireStaff();
  const { q = "", pagina = "1", borrado } = await searchParams;
  const page = Math.max(1, Number.parseInt(pagina, 10) || 1);
  const query = q.trim();

  const [settings, total, customers] = await Promise.all([
    getSettings(),
    countCustomers(),
    searchCustomers(query, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE),
  ]);
  const hasMore = customers.length > PAGE_SIZE;
  const shown = customers.slice(0, PAGE_SIZE);
  const pending = await pendingRewardsMap(shown.map((c) => c.id));
  const pageHref = (p: number) => `/panel/clientes?${new URLSearchParams({ ...(query ? { q: query } : {}), pagina: String(p) })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Clientes</h1>
          <p className="mt-1 text-cafe/60">
            {total} {total === 1 ? "cliente registrado" : "clientes registrados"}
          </p>
        </div>
        {staff.role === "owner" ? (
          <a href="/panel/clientes/exportar" className={buttonClass("secondary", "sm")} download>
            Exportar a Excel (CSV)
          </a>
        ) : null}
      </div>

      {borrado ? <Notice tone="success">El cliente se borró.</Notice> : null}

      <form className="flex max-w-xl gap-2" action="/panel/clientes">
        <label htmlFor="q" className="sr-only">
          Buscar
        </label>
        <Input id="q" name="q" type="search" defaultValue={query} placeholder="Nombre, celular o código" autoComplete="off" />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {shown.length === 0 ? (
        <div className="rounded-2xl bg-papel px-6 py-10 text-center ring-1 ring-cafe/10">
          <p className="font-display text-xl">{query ? "Sin resultados" : "Aún no hay clientes"}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-cafe/60">
            {query
              ? `Nadie coincide con “${query}”.`
              : "Imprime el cartel con el QR de registro y ponlo en caja para que tus clientes se unan."}
          </p>
          {!query ? (
            <Link href="/panel/cartel" className={buttonClass("primary", "md", "mt-5")}>
              Ver cartel con QR
            </Link>
          ) : null}
        </div>
      ) : (
        <CustomerList customers={shown} settings={settings} pendingByCustomer={pending} />
      )}

      {page > 1 || hasMore ? (
        <nav className="flex justify-between" aria-label="Páginas">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={buttonClass("ghost", "sm")}>
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          {hasMore ? (
            <Link href={pageHref(page + 1)} className={buttonClass("ghost", "sm")}>
              Siguientes →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
