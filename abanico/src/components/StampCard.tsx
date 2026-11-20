"use client";

import { useEffect, useRef, useState } from "react";
import { FanIcon, GiftIcon } from "@/components/icons";
import { cx } from "@/components/ui";

type Level = { at: number; title: string };

/** Pequeña rotación fija por casilla para que los sellos se vean "a mano". */
function tilt(index: number): number {
  const values = [-9, 6, -4, 8, -6, 3, -8, 5, -3, 7];
  return values[index % values.length];
}

function columnsFor(length: number): number {
  if (length <= 4) return length;
  if (length <= 6) return 3;
  if (length <= 10) return 5;
  if (length <= 12) return 6;
  if (length <= 16) return 4;
  if (length <= 25) return 5;
  return 6;
}

/** Tarjeta de sellos por niveles: cada nivel entrega un premio y el último completa la tarjeta. */
export function StampCard({
  businessName,
  customerName,
  stamps,
  levels,
}: {
  businessName: string;
  customerName?: string;
  stamps: number;
  levels: Level[];
}) {
  const sorted = [...levels].sort((a, b) => a.at - b.at);
  const length = sorted.length ? sorted[sorted.length - 1].at : 0;
  const shown = Math.min(stamps, length);
  const previous = useRef(shown);
  const [fresh, setFresh] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (shown > previous.current) {
      setFresh({ from: previous.current, to: shown });
      navigator.vibrate?.(40);
      const timer = setTimeout(() => setFresh(null), 1200);
      previous.current = shown;
      return () => clearTimeout(timer);
    }
    previous.current = shown;
  }, [shown]);

  if (length === 0) return null;
  const levelAt = new Map(sorted.map((l) => [l.at, l.title]));
  const next = sorted.find((l) => l.at > shown);
  const remaining = next ? next.at - shown : 0;

  return (
    <div
      className="relative overflow-hidden rounded-[1.6rem] bg-papel shadow-[0_18px_40px_-24px_rgb(42_33_28/0.45)] ring-1 ring-tinta/10"
      aria-label={`Tarjeta de sellos: ${shown} de ${length}`}
    >
      <div className="relative overflow-hidden bg-terracota px-5 pb-5 pt-5 text-papel sm:px-6">
        <FanIcon ribs={false} className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 -rotate-[18deg] text-papel/[0.08]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-papel/75">Tarjeta de sellos</p>
            <p className="mt-1 truncate font-display text-2xl font-semibold leading-tight">{businessName}</p>
            {customerName ? <p className="mt-0.5 truncate text-sm text-papel/85">{customerName}</p> : null}
          </div>
          <p className="shrink-0 font-display text-3xl font-semibold tabular-nums leading-none" aria-hidden="true">
            {shown}
            <span className="text-lg text-papel/70">/{length}</span>
          </p>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <ol className="grid gap-2 sm:gap-2.5" style={{ gridTemplateColumns: `repeat(${columnsFor(length)}, minmax(0, 1fr))` }}>
          {Array.from({ length }, (_, i) => {
            const position = i + 1;
            const filled = position <= shown;
            const prize = levelAt.get(position);
            const justStamped = fresh !== null && position > fresh.from && position <= fresh.to;
            return (
              <li
                key={position}
                title={prize ? `Sello ${position}: ${prize}` : undefined}
                className={cx(
                  "relative flex aspect-square items-center justify-center rounded-full",
                  filled
                    ? prize
                      ? "bg-ocre/25 ring-2 ring-ocre"
                      : "bg-terracota/[0.08]"
                    : prize
                      ? "border-2 border-dashed border-ocre bg-ocre/10"
                      : "border-2 border-dashed border-tinta/15"
                )}
              >
                {filled ? (
                  <FanIcon
                    className={cx("h-[72%] w-[72%] text-terracota", justStamped && "animate-stamp-in")}
                    style={{ transform: justStamped ? undefined : `rotate(${tilt(i)}deg)` }}
                  />
                ) : prize ? (
                  <GiftIcon className="h-[52%] w-[52%] text-ocre" />
                ) : (
                  <span className="text-[11px] font-semibold tabular-nums text-tinta/25">{position}</span>
                )}
              </li>
            );
          })}
        </ol>

        <ul className="mt-5 space-y-2 border-t border-dashed border-tinta/15 pt-4">
          {sorted.map((level) => {
            const reached = shown >= level.at;
            const isNext = next?.at === level.at;
            return (
              <li key={level.at} className="flex items-center gap-3 text-sm">
                <span
                  className={cx(
                    "flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                    reached ? "bg-ocre text-tinta" : isNext ? "bg-terracota text-papel" : "bg-tinta/[0.07] text-tinta/60"
                  )}
                >
                  {level.at}º
                </span>
                <span className={cx("min-w-0 flex-1", reached ? "text-tinta/60" : "text-tinta")}>{level.title}</span>
                {reached ? (
                  <span className="shrink-0 text-xs font-semibold text-salvia">✓ Ganado</span>
                ) : isNext ? (
                  <span className="shrink-0 text-xs font-semibold text-terracota">
                    {remaining === 1 ? "¡Te falta 1!" : `Faltan ${remaining}`}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
