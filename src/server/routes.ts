// Manejadores de la API. Reciben un `Request` estándar y devuelven un
// `Response`, así se pueden probar directamente sin levantar Next.js. Los
// archivos `src/app/api/**/route.ts` solo los reexportan.

import {
  changePassword,
  clearSessionCookie,
  deleteAccount,
  login,
  logout,
  register,
  requireUser,
  getSessionUser,
  sessionCookie,
  updateProfile,
} from "@/server/auth";
import { MAX_DATA_BYTES, loadClinicData, saveClinicData } from "@/server/clinic-data";
import { assertSameOrigin, handle, json, readJson } from "@/server/http";

export function postRegister(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readJson(request);
    const { user, token } = await register({
      name: body.name,
      email: body.email,
      password: body.password,
      specialty: body.specialty,
      acceptPrivacy: body.acceptPrivacy,
    });
    return json({ user }, 201, { "set-cookie": sessionCookie(request, token) });
  });
}

export function postLogin(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readJson(request);
    const { user, token } = await login({ email: body.email, password: body.password });
    return json({ user }, 200, { "set-cookie": sessionCookie(request, token) });
  });
}

export function postLogout(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    await logout(request);
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) });
  });
}

export function getMe(request: Request) {
  return handle(async () => {
    const user = await getSessionUser(request);
    return json({ user });
  });
}

export function patchMe(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await readJson(request);
    return json({ user: await updateProfile(user, { name: body.name, specialty: body.specialty }) });
  });
}

export function postPassword(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await readJson(request);
    await changePassword(request, user, body.currentPassword, body.newPassword);
    return json({ ok: true });
  });
}

export function deleteMyAccount(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await readJson(request);
    await deleteAccount(user, body.password);
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) });
  });
}

export function getData(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    return json(await loadClinicData(user.id));
  });
}

export function putData(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await readJson<{ snapshot: unknown; version: unknown }>(request, MAX_DATA_BYTES);
    const version = await saveClinicData(user.id, body.snapshot, body.version);
    return json({ version });
  });
}
