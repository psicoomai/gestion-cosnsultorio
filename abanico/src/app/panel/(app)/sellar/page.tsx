import type { Metadata } from "next";
import { CustomerList } from "@/components/panel/CustomerList";
import { QrScanner } from "@/components/panel/QrScanner";
import { Button, Input, Notice } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings, searchCustomers } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Caja" };

export default async function CashierPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  await requireStaff();
  const { q = "", error } = await searchParams;
  const query = q.trim();
  const [settings, results] = await Promise.all([getSettings(), query ? searchCustomers(query, 20) : Promise.resolve([])]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Caja</h1>
        <p className="mt-1 text-tinta/65">
          Escanea la tarjeta del cliente para {settings.stampsEnabled ? "darle sellos" : "sumarle puntos"} o canjear un premio.
        </p>
      </div>

      {error === "no-encontrada" ? (
        <Notice tone="error">No encontramos esa tarjeta. Pide al cliente que abra la suya o búscalo por su celular.</Notice>
      ) : null}

      <QrScanner />

      <section aria-labelledby="buscar" className="space-y-3">
        <h2 id="buscar" className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-tinta/60">
          O busca al cliente
        </h2>
        <form className="flex gap-2" action="/panel/sellar">
          <label htmlFor="q" className="sr-only">
            Nombre, celular o código de tarjeta
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Nombre, celular o código"
            autoComplete="off"
            enterKeyHint="search"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
        {query ? (
          results.length > 0 ? (
            <CustomerList customers={results} settings={settings} />
          ) : (
            <p className="rounded-2xl bg-papel px-5 py-4 text-sm text-tinta/65 ring-1 ring-tinta/10">
              No hay clientes que coincidan con “{query}”. Si aún no tiene tarjeta, pídele que escanee el QR de registro.
            </p>
          )
        ) : null}
      </section>
    </div>
  );
}
