import type { Config } from "tailwindcss";
import { themeColorRgbTriplets, themeColors, withOpacity } from "./src/lib/theme-colors";

const darkRgb = themeColorRgbTriplets.dark;

// El objeto `colors` reemplaza por completo la paleta por defecto de Tailwind
// (grises, azules, rojos, etc.) para que sea IMPOSIBLE usar accidentalmente
// un color fuera de la paleta autorizada a través de una clase de utilidad.
// Toda variante viene de src/lib/theme-colors.ts (fuente única de verdad).
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      dark: withOpacity(themeColors.dark),
      background: withOpacity(themeColors.background),
      "blue-secondary": withOpacity(themeColors.blueSecondary),
      "blue-accent": withOpacity(themeColors.blueAccent),
      "orange-accent": withOpacity(themeColors.orangeAccent),
      "debt-red": withOpacity(themeColors.debtRed),
    },
    extend: {
      fontFamily: {
        serif: ["var(--font-editorial)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        soft: `0 1px 2px rgb(${darkRgb} / 0.06), 0 1px 1px rgb(${darkRgb} / 0.04)`,
        card: `0 1px 3px rgb(${darkRgb} / 0.08), 0 1px 2px rgb(${darkRgb} / 0.05)`,
      },
      letterSpacing: {
        tightish: "-0.01em",
        wideish: "0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
