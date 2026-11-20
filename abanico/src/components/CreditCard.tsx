import { formatMoney } from "@/lib/money";

/** Saldo a favor del cliente (reembolso en efectivo). */
export function CreditCard({ creditCents, percent }: { creditCents: number; percent: number }) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] bg-limon ring-1 ring-cafe/10">
      <div className="flex items-end justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cafe/70">Saldo a favor</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums leading-none text-cafe">
            {formatMoney(creditCents)}
          </p>
        </div>
        <p className="max-w-[11rem] text-right text-xs leading-snug text-cafe/80">
          Recibes el {percent} % de cada compra para usarlo en tus siguientes compras
        </p>
      </div>
      <p className="border-t border-cafe/10 bg-limon-suave px-5 py-3 text-xs text-cafe/75 sm:px-6">
        {creditCents > 0 ? "Pide en caja que lo apliquen a tu compra." : "Tu saldo empieza a crecer con tu próxima compra."}
      </p>
    </div>
  );
}
