import { beforeEach, describe, expect, it } from "vitest";
import { useTestDb, type Db } from "@/server/db";
import { decryptText, encryptText, hashPassword, verifyPassword } from "@/server/crypto";
import {
  deleteMyAccount,
  getData,
  getMe,
  postLogin,
  postLogout,
  postPassword,
  postRegister,
  putData,
} from "@/server/routes";

const ORIGIN = "http://localhost:3000";

function req(path: string, init: { method?: string; body?: unknown; cookie?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = { host: "localhost:3000", "content-type": "application/json" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.cookie) headers.cookie = init.cookie;
  return new Request(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

function cookieFrom(res: Response): string {
  const set = res.headers.get("set-cookie") ?? "";
  return set.split(";")[0];
}

async function registerUser(email: string, password = "contraseña-segura") {
  const res = await postRegister(
    req("/api/auth/register", {
      method: "POST",
      body: { name: "Psic. Prueba", email, password, acceptPrivacy: true },
    })
  );
  return { res, cookie: cookieFrom(res) };
}

const snapshot = (name: string) => ({
  version: 1,
  profile: { name: "Psic. Prueba" },
  patients: [{ id: "p1", name }],
  sessions: [{ id: "s1", patientId: "p1", date: "2026-11-01", amount: 700 }],
  payments: [],
});

let db: Db;
beforeEach(async () => {
  db = await useTestDb();
});

describe("criptografía", () => {
  it("verifica contraseñas sin guardarlas en claro", async () => {
    const hash = await hashPassword("mi-contraseña");
    expect(hash).not.toContain("mi-contraseña");
    expect(await verifyPassword("mi-contraseña", hash)).toBe(true);
    expect(await verifyPassword("otra", hash)).toBe(false);
  });

  it("cifra y descifra los datos", () => {
    const encrypted = encryptText("Paciente Secreto");
    expect(encrypted).not.toContain("Paciente");
    expect(decryptText(encrypted)).toBe("Paciente Secreto");
  });
});

describe("cuentas", () => {
  it("registra, devuelve la sesión y exige aceptar el aviso de privacidad", async () => {
    const noPrivacy = await postRegister(
      req("/api/auth/register", { method: "POST", body: { name: "A", email: "a@b.com", password: "12345678" } })
    );
    expect(noPrivacy.status).toBe(400);

    const { res, cookie } = await registerUser("ana@example.com");
    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/);
    const me = await (await getMe(req("/api/auth/me", { cookie }))).json();
    expect(me.user.email).toBe("ana@example.com");
  });

  it("no permite dos cuentas con el mismo correo", async () => {
    await registerUser("ana@example.com");
    const { res } = await registerUser("ANA@example.com ");
    expect(res.status).toBe(409);
  });

  it("rechaza contraseñas cortas y correos inválidos", async () => {
    expect((await registerUser("ana@example.com", "123")).res.status).toBe(400);
    expect((await registerUser("no-es-correo")).res.status).toBe(400);
  });

  it("inicia y cierra sesión", async () => {
    await registerUser("ana@example.com");
    const bad = await postLogin(
      req("/api/auth/login", { method: "POST", body: { email: "ana@example.com", password: "incorrecta" } })
    );
    expect(bad.status).toBe(401);
    const ok = await postLogin(
      req("/api/auth/login", { method: "POST", body: { email: "ana@example.com", password: "contraseña-segura" } })
    );
    expect(ok.status).toBe(200);
    const cookie = cookieFrom(ok);
    await postLogout(req("/api/auth/logout", { method: "POST", cookie }));
    const me = await (await getMe(req("/api/auth/me", { cookie }))).json();
    expect(me.user).toBeNull();
  });

  it("bloquea la cuenta tras 5 intentos fallidos", async () => {
    await registerUser("ana@example.com");
    for (let i = 0; i < 5; i++) {
      await postLogin(req("/api/auth/login", { method: "POST", body: { email: "ana@example.com", password: "x" } }));
    }
    const locked = await postLogin(
      req("/api/auth/login", { method: "POST", body: { email: "ana@example.com", password: "contraseña-segura" } })
    );
    expect(locked.status).toBe(429);
  });

  it("rechaza peticiones de otro origen (CSRF)", async () => {
    const res = await postRegister(
      req("/api/auth/register", {
        method: "POST",
        origin: "https://sitio-malicioso.com",
        body: { name: "A", email: "a@b.com", password: "12345678", acceptPrivacy: true },
      })
    );
    expect(res.status).toBe(403);
  });

  it("cambia la contraseña con la actual correcta", async () => {
    const { cookie } = await registerUser("ana@example.com");
    const wrong = await postPassword(
      req("/api/auth/password", { method: "POST", cookie, body: { currentPassword: "x", newPassword: "nueva-contraseña" } })
    );
    expect(wrong.status).toBe(403);
    const ok = await postPassword(
      req("/api/auth/password", {
        method: "POST",
        cookie,
        body: { currentPassword: "contraseña-segura", newPassword: "nueva-contraseña" },
      })
    );
    expect(ok.status).toBe(200);
    const login = await postLogin(
      req("/api/auth/login", { method: "POST", body: { email: "ana@example.com", password: "nueva-contraseña" } })
    );
    expect(login.status).toBe(200);
  });
});

describe("datos del consultorio", () => {
  it("cada cuenta ve solo sus propios datos", async () => {
    const ana = await registerUser("ana@example.com");
    const luis = await registerUser("luis@example.com");

    const saved = await putData(
      req("/api/data", { method: "PUT", cookie: ana.cookie, body: { snapshot: snapshot("Paciente de Ana"), version: 0 } })
    );
    expect(saved.status).toBe(200);

    const anaData = await (await getData(req("/api/data", { cookie: ana.cookie }))).json();
    expect(anaData.snapshot.patients[0].name).toBe("Paciente de Ana");
    const luisData = await (await getData(req("/api/data", { cookie: luis.cookie }))).json();
    expect(luisData.snapshot).toBeNull();
  });

  it("guarda los datos cifrados en la base de datos", async () => {
    const ana = await registerUser("ana@example.com");
    await putData(req("/api/data", { method: "PUT", cookie: ana.cookie, body: { snapshot: snapshot("Nombre Visible"), version: 0 } }));
    const rows = await db.query<{ payload: string }>(`SELECT payload FROM clinic_data`);
    expect(rows[0].payload).not.toContain("Nombre Visible");
  });

  it("sin sesión no se puede leer ni escribir", async () => {
    expect((await getData(req("/api/data"))).status).toBe(401);
    expect((await putData(req("/api/data", { method: "PUT", body: { snapshot: snapshot("x"), version: 0 } }))).status).toBe(401);
  });

  it("detecta conflictos cuando otro dispositivo guardó antes", async () => {
    const ana = await registerUser("ana@example.com");
    const first = await (await putData(req("/api/data", { method: "PUT", cookie: ana.cookie, body: { snapshot: snapshot("v1"), version: 0 } }))).json();
    expect(first.version).toBe(1);
    const second = await putData(req("/api/data", { method: "PUT", cookie: ana.cookie, body: { snapshot: snapshot("v2"), version: 1 } }));
    expect(second.status).toBe(200);
    const stale = await putData(req("/api/data", { method: "PUT", cookie: ana.cookie, body: { snapshot: snapshot("viejo"), version: 1 } }));
    expect(stale.status).toBe(409);
  });

  it("rechaza datos con formato inválido", async () => {
    const ana = await registerUser("ana@example.com");
    const res = await putData(req("/api/data", { method: "PUT", cookie: ana.cookie, body: { snapshot: { hola: 1 }, version: 0 } }));
    expect(res.status).toBe(400);
  });

  it("eliminar la cuenta borra también sus datos", async () => {
    const ana = await registerUser("ana@example.com");
    await putData(req("/api/data", { method: "PUT", cookie: ana.cookie, body: { snapshot: snapshot("x"), version: 0 } }));
    const wrong = await deleteMyAccount(req("/api/account", { method: "DELETE", cookie: ana.cookie, body: { password: "x" } }));
    expect(wrong.status).toBe(403);
    const ok = await deleteMyAccount(
      req("/api/account", { method: "DELETE", cookie: ana.cookie, body: { password: "contraseña-segura" } })
    );
    expect(ok.status).toBe(200);
    expect(await db.query(`SELECT 1 FROM clinic_data`)).toHaveLength(0);
    expect(await db.query(`SELECT 1 FROM users`)).toHaveLength(0);
  });
});
