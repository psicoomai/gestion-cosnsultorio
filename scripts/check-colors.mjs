#!/usr/bin/env node
// Audita el repositorio en busca de colores (hex, rgb(), hsl(), o nombres de
// color CSS) escritos fuera de la única fuente de verdad de la paleta:
// src/lib/theme-colors.ts. Cualquier otro archivo debe consumir los colores
// a través de las clases de Tailwind (bg-dark, text-debt-red, etc.) o
// importando `themeColors` desde ese archivo — nunca escribiendo un literal.

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css", ".mdx"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "out", "build"]);

// Único archivo autorizado a contener literales de color: la fuente de verdad.
const ALLOWED_LITERAL_FILE = "src/lib/theme-colors.ts";

// Solo se marca rgb()/hsl() cuando llevan un número literal justo después
// del paréntesis (p. ej. `rgb(76 68 60)`). Así no se marcan usos legítimos
// que derivan el color de una variable o de un token, como
// `rgb(${darkRgb} / 0.06)` o `rgb(var(--x) / <alpha-value>)`.
const COLOR_PATTERNS = [
  { name: "hex", regex: /#[0-9a-fA-F]{3,8}\b/g },
  { name: "rgb()/rgba() literal", regex: /\brgba?\s*\(\s*\d/gi },
  { name: "hsl()/hsla() literal", regex: /\bhsla?\s*\(\s*\d/gi },
];

/** @type {string[]} */
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;

    const relPath = relative(rootDir, fullPath).split("\\").join("/");
    if (relPath === ALLOWED_LITERAL_FILE) continue;

    const content = readFileSync(fullPath, "utf8");
    for (const { name, regex } of COLOR_PATTERNS) {
      const matches = content.match(regex);
      if (matches) {
        violations.push(`${relPath}: encontrado color literal (${name}) → ${matches.join(", ")}`);
      }
    }
  }
}

walk(rootDir);

if (violations.length > 0) {
  console.error("✖ Colores fuera de la paleta autorizada:\n");
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    `\nUsa las clases de Tailwind (bg-dark, text-debt-red, ...) o importa themeColors desde ${ALLOWED_LITERAL_FILE}.`
  );
  process.exit(1);
}

console.log("✔ Sin colores fuera de la paleta autorizada.");
