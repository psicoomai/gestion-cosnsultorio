import type { Settings } from "@/lib/loyalty";

const fmt = new Intl.NumberFormat("es-MX");

/** Resumen en una frase de cómo funciona el programa, para el público. */
export function programSummary(s: Settings): string {
  const parts: string[] = [];
  if (s.stampsEnabled) {
    parts.push(`junta ${s.stampsRequired} sellos y gana ${s.rewardTitle.toLowerCase()}`);
  }
  if (s.pointsEnabled) {
    const earn = s.earnPoints === 1 ? "1 punto" : `${fmt.format(s.earnPoints)} puntos`;
    parts.push(`gana ${earn} por cada $${fmt.format(s.earnAmount)} y cámbialos por premios`);
  }
  if (s.cashbackEnabled) {
    parts.push(`recibe ${s.cashbackPercent} % de cada compra como saldo a favor`);
  }
  const text = parts.join("; además, ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}
