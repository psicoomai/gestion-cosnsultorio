import { describe, expect, it } from "vitest";
import { parseSnapshot } from "@/lib/storage";

describe("parseSnapshot", () => {
  it("acepta un respaldo válido", () => {
    const snap = parseSnapshot({
      profile: { name: "Psic. Prueba" },
      patients: [{ id: "a", name: "A" }],
      sessions: [{ id: "s", patientId: "a", date: "2026-01-01", amount: 1 }],
      payments: [{ id: "p", patientId: "a", amount: 1, sessionIds: ["s"] }],
    });
    expect(snap.profile?.name).toBe("Psic. Prueba");
    expect(snap.sessions).toHaveLength(1);
  });

  it("rechaza archivos que no son respaldos o con referencias rotas", () => {
    expect(() => parseSnapshot("hola")).toThrow();
    expect(() => parseSnapshot({ patients: [] })).toThrow();
    expect(() =>
      parseSnapshot({ patients: [], sessions: [{ id: "s", patientId: "x", date: "2026-01-01", amount: 1 }], payments: [] })
    ).toThrow(/no existe/);
  });
});
