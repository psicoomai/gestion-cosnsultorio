/**
 * ÚNICA fuente de verdad para la paleta de colores de la aplicación.
 *
 * No declares colores hexadecimales, rgb(), hsl() o nombres de color en
 * ningún otro archivo (componentes, CSS, configuración de gráficas, etc.).
 * Para cambiar la identidad visual de toda la app, edita únicamente este
 * archivo — `tailwind.config.ts` y cualquier gráfica lo consumen desde aquí.
 *
 * `npm run check:colors` audita el repositorio en busca de colores que no
 * provengan de esta paleta.
 */

export const themeColors = {
  /** Tono oscuro principal — texto, navegación, encabezados, contraste. */
  dark: "#4C443C",
  /** Fondo principal / superficies claras. */
  background: "#EFEDE7",
  /** Azul secundario — elementos interactivos e informativos. */
  blueSecondary: "#6698B7",
  /** Azul de acento — botones primarios, indicadores, gráficas. */
  blueAccent: "#7096FF",
  /** Naranja de acento — atención/diferenciación, nunca error. */
  orangeAccent: "#D17B0F",
  /** Rojo reservado EXCLUSIVAMENTE para adeudos y saldos pendientes. */
  debtRed: "#E0000F",
} as const;

export type ThemeColorName = keyof typeof themeColors;

/** Convierte "#RRGGBB" en el triplete "R G B" que exige Tailwind para soportar `/opacidad`. */
function hexToRgbTriplet(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Tripletes RGB listos para usarse en `rgb(var(--x) / <alpha>)` o directamente en Tailwind. */
export const themeColorRgbTriplets = Object.fromEntries(
  Object.entries(themeColors).map(([key, hex]) => [key, hexToRgbTriplet(hex)])
) as Record<ThemeColorName, string>;

/** Genera el valor de color de Tailwind con soporte de opacidad (`clase/50`, etc.). */
export function withOpacity(hex: string): string {
  return `rgb(${hexToRgbTriplet(hex)} / <alpha-value>)`;
}
