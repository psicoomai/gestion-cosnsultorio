"use client";

import { useEffect, useRef, useState } from "react";
import { FanIcon, GiftIcon } from "@/components/icons";
import { cx } from "@/components/ui";

/** Pequeña rotación fija por casilla para que los sellos se vean "a mano". */
function tilt(index: number): number {
  const values = [-9, 6, -4, 8, -6, 3, -8, 5, -3, 7];
  return values[index % values.length];
}

function columnsFor(required: number): number {
  if (required <= 4) return required;
  if (required <= 6) return 3;
  if (required <= 10) return 5;
  if (required <= 12) return 6;
  if (required <= 16) return 4;
  if (required <= 25) return 5;
  return 6;
}

/** Tarjeta de sellos: al completar `required` sellos se gana la recompensa. */
export function StampCard({
  businessName,
  customerName,
  stamps,
  required,
  rewardTitle,
}: {
  businessName: string;
  customerName?: string;
  stamps: number;
  required: number;
  rewardTitle: string;
}) {
  const shown = Math.min(stamps, required);
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

  const remaining = Math.max(required - shown, 0);

  return (
    <div
      className="relative overflow-hidden rounded-[1.6rem] bg-papel shadow-[0_18px_40px_-24px_rgb(60_36_21/0.4)] ring-1 ring-cafe/10"
      aria-label={`Tarjeta de sellos: ${shown} de ${required}`}
    >
      <div className="bg-cafe px-5 pb-5 pt-5 text-crema sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-limon">Tarjeta de sellos</p>
            <p className="mt-1 truncate font-display text-2xl font-semibold leading-tight">{businessName}</p>
            {customerName ? <p className="mt-0.5 truncate text-sm text-crema/80">{customerName}</p> : null}
          </div>
          <p className="shrink-0 font-display text-3xl font-semibold tabular-nums leading-none" aria-hidden="true">
            {shown}
            <span className="text-lg text-crema/60">/{required}</span>
          </p>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <ol className="grid gap-2.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${columnsFor(required)}, minmax(0, 1fr))` }}>
          {Array.from({ length: required }, (_, i) => {
            const position = i + 1;
            const filled = position <= shown;
            const isLast = position === required;
            const justStamped = fresh !== null && position > fresh.from && position <= fresh.to;
            return (
              <li
                key={position}
                className={cx(
                  "relative flex aspect-square items-center justify-center rounded-full [--fan-rib:var(--color-limon)]",
                  filled
                    ? "bg-limon"
                    : isLast
                      ? "border-2 border-dashed border-azul bg-azul/10"
                      : "border-2 border-dashed border-cafe/15"
                )}
              >
                {filled ? (
                  <FanIcon
                    className={cx("h-[72%] w-[72%] text-cafe", justStamped && "animate-stamp-in")}
                    style={{ transform: justStamped ? undefined : `rotate(${tilt(i)}deg)` }}
                  />
                ) : isLast ? (
                  <GiftIcon className="h-[52%] w-[52%] text-cafe/70" />
                ) : (
                  <span className="text-xs font-semibold tabular-nums text-cafe/25">{position}</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-dashed border-cafe/15 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cafe/55">Tu recompensa</p>
            <p className="mt-0.5 font-display text-lg leading-snug">{rewardTitle}</p>
          </div>
          <p className="shrink-0 rounded-full bg-limon-suave px-3 py-1 text-right text-sm font-semibold text-cafe ring-1 ring-limon">
            {remaining === 1 ? "¡Te falta 1 sello!" : `Te faltan ${remaining}`}
          </p>
        </div>
      </div>
    </div>
  );
}
