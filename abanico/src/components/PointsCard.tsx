import { cx } from "@/components/ui";

type CatalogItem = { id: number; title: string; cost: number };

const fmt = new Intl.NumberFormat("es-MX");

/** Saldo de puntos del cliente y lo que puede canjear con ellos. */
export function PointsCard({
  points,
  earnAmount,
  earnPoints,
  catalog,
}: {
  points: number;
  earnAmount: number;
  earnPoints: number;
  catalog: CatalogItem[];
}) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] bg-papel ring-1 ring-cafe/10">
      <div className="flex items-end justify-between gap-4 bg-azul px-5 py-5 text-cafe sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cafe/75">Tus puntos</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums leading-none">{fmt.format(points)}</p>
        </div>
        <p className="max-w-[10rem] text-right text-xs leading-snug text-cafe/80">
          Ganas {earnPoints === 1 ? "1 punto" : `${fmt.format(earnPoints)} puntos`} por cada ${fmt.format(earnAmount)} de compra
        </p>
      </div>
      {catalog.length > 0 ? (
        <ul className="divide-y divide-cafe/10 px-5 sm:px-6">
          {catalog.map((item) => {
            const ready = points >= item.cost;
            const progress = Math.min(points / item.cost, 1);
            return (
              <li key={item.id} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{item.title}</span>
                  <span className={cx("shrink-0 text-sm tabular-nums", ready ? "rounded-full bg-limon px-2 font-bold text-cafe" : "text-cafe/60")}>
                    {fmt.format(item.cost)} pts
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cafe/[0.08]">
                  <div
                    className={cx("h-full rounded-full", ready ? "bg-cafe" : "bg-azul")}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className={cx("mt-1.5 text-xs", ready ? "font-semibold text-cafe" : "text-cafe/55")}>
                  {ready ? "¡Ya te alcanza! Pídelo en caja." : `Te faltan ${fmt.format(item.cost - points)} puntos`}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
