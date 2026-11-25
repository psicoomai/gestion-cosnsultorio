// Almacenamiento en la cuenta del usuario (servidor). Implementa la misma
// interfaz que el almacenamiento del navegador, así que el resto de la app
// no cambia. Lleva la versión de los datos para detectar si otro dispositivo
// guardó cambios mientras tanto.

import { parseSnapshot, type ClinicSnapshot, type ClinicStore } from "@/lib/storage";

export class ConflictError extends Error {}
export class AuthLostError extends Error {}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body.error === "string" ? body.error : "No se pudo guardar.";
  } catch {
    return "No se pudo guardar.";
  }
}

export function createApiStore(onAuthLost: () => void): ClinicStore {
  let version = 0;

  return {
    async load() {
      const res = await fetch("/api/data", { credentials: "same-origin", cache: "no-store" });
      if (res.status === 401) {
        onAuthLost();
        throw new AuthLostError("Sesión terminada");
      }
      if (!res.ok) throw new Error(await errorMessage(res));
      const body = (await res.json()) as { snapshot: unknown; version: number };
      version = body.version;
      return body.snapshot ? parseSnapshot(body.snapshot) : null;
    },
    async save(snapshot: ClinicSnapshot) {
      const res = await fetch("/api/data", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot, version }),
      });
      if (res.status === 401) {
        onAuthLost();
        throw new AuthLostError("Sesión terminada");
      }
      if (res.status === 409) throw new ConflictError(await errorMessage(res));
      if (!res.ok) throw new Error(await errorMessage(res));
      version = ((await res.json()) as { version: number }).version;
    },
    async clear() {
      // En la cuenta, "borrar todo" guarda un consultorio vacío (lo hace el proveedor).
    },
  };
}
