// Compila la versión de prueba de una sola página (npm run build:demo).
import { fileURLToPath } from "node:url";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here("."),
  base: "./",
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: here("./shims/link.tsx") },
      { find: /^next\/navigation$/, replacement: here("./shims/navigation.ts") },
      { find: /^@\//, replacement: here("../../src/") },
    ],
  },
  esbuild: { jsx: "automatic" },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  css: {
    postcss: { plugins: [tailwindcss({ config: here("../../tailwind.config.ts") }), autoprefixer()] },
  },
  build: {
    outDir: here("../../out-demo"),
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return; // "use client"
        warn(warning);
      },
      output: {
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "app[extname]",
      },
    },
  },
});
