// Sustituto de `next/navigation` para la versión de prueba de una sola
// página: la ruta vive en memoria (el marco de claude.ai no admite rutas en
// la URL), y las mismas pantallas de la app funcionan sin cambios.

import { useSyncExternalStore } from "react";

let current = "/";
const listeners = new Set<() => void>();

export function navigate(path: string) {
  const next = path.split("#")[0].split("?")[0] || "/";
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

export function useRouter() {
  return {
    push: navigate,
    replace: navigate,
    back: () => navigate("/"),
    forward: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}
