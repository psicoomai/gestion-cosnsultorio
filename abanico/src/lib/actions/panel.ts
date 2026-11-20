"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  createStaff,
  endSession,
  findStaffForLogin,
  getStaffPasswordHash,
  hasAnyStaff,
  normalizeUsername,
  requireOwner,
  requireStaff,
  setStaffActive,
  setStaffPassword,
  startSession,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "@/lib/auth";
import { parseBirthday } from "@/lib/birthday";
import { normalizeCardCode } from "@/lib/codes";
import {
  addCatalogItem,
  deleteCustomer,
  getCustomerById,
  getSettings,
  recordVisit,
  redeemStampReward,
  redeemWithPoints,
  removePoints,
  removeStamp,
  saveProgram,
  setBusinessName,
  updateCatalogItem,
  updateCustomer,
} from "@/lib/loyalty";
import { normalizePhone } from "@/lib/phone";
import { clear, clientIp, hit } from "@/lib/rate-limit";
import { MAX_STAMPS_PER_VISIT, STAMPS_MAX, STAMPS_MIN, parseMoneyToCents } from "@/lib/stamps";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Para distinguir envíos consecutivos con el mismo mensaje. */
  at?: number;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function intField(formData: FormData, key: string): number {
  const value = Number(text(formData, key));
  return Number.isInteger(value) ? value : NaN;
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = normalizeUsername(text(formData, "username"));
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Escribe tu usuario y contraseña." };

  const key = `login:${await clientIp()}:${username}`;
  if (!hit(key, 8, 15 * 60_000)) {
    return { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." };
  }

  const found = await findStaffForLogin(username);
  const valid = found ? await verifyPassword(password, found.passwordHash) : false;
  if (!found || !valid) return { error: "Usuario o contraseña incorrectos." };

  clear(key);
  await startSession(found.staff.id, found.sessionVersion);
  redirect("/panel");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/panel/entrar");
}

export async function setupBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  if (await hasAnyStaff()) redirect("/panel/entrar");

  const expectedCode = process.env.SETUP_CODE?.trim();
  if (process.env.NODE_ENV === "production" && !expectedCode) {
    return { error: "Falta definir la variable SETUP_CODE en el servidor." };
  }
  if (expectedCode && text(formData, "setupCode") !== expectedCode) {
    if (!hit(`setup:${await clientIp()}`, 10, 15 * 60_000)) {
      return { error: "Demasiados intentos. Espera unos minutos." };
    }
    return { fieldErrors: { setupCode: "El código de configuración no es correcto." } };
  }

  const businessName = text(formData, "businessName");
  const name = text(formData, "name");
  const username = normalizeUsername(text(formData, "username"));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (businessName.length < 2 || businessName.length > 40) fieldErrors.businessName = "Escribe el nombre del negocio.";
  if (name.length < 2 || name.length > 60) fieldErrors.name = "Escribe tu nombre.";
  const usernameError = validateUsername(username);
  if (usernameError) fieldErrors.username = usernameError;
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  else if (password !== confirm) fieldErrors.confirm = "Las contraseñas no coinciden.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Volvemos a revisar justo antes de crear la cuenta para evitar dos dueños.
  if (await hasAnyStaff()) redirect("/panel/entrar");
  await setBusinessName(businessName);
  const created = await createStaff({ name, username, password, role: "owner" });
  if (!created.ok) return { error: created.error };
  await startSession(created.id, 1);
  redirect("/panel/ajustes?inicio=1");
}

// ---------------------------------------------------------------------------
// Compras, sellos, puntos y premios
// ---------------------------------------------------------------------------

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export async function recordVisitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const settings = await getSettings();
  const customerId = intField(formData, "customerId");
  const stamps = settings.stampsEnabled ? intField(formData, "stamps") : 0;
  const amountText = text(formData, "purchase");
  const purchaseCents = settings.pointsEnabled && amountText ? parseMoneyToCents(amountText) : null;

  if (settings.stampsEnabled && !(stamps >= 0 && stamps <= MAX_STAMPS_PER_VISIT)) {
    return { error: `Puedes dar de 0 a ${MAX_STAMPS_PER_VISIT} sellos a la vez.`, at: Date.now() };
  }
  if (settings.pointsEnabled && amountText && purchaseCents === null) {
    return { fieldErrors: { purchase: "Escribe el monto en pesos, por ejemplo 85 o 85.50." }, at: Date.now() };
  }

  const result = await recordVisit({ customerId, staffId: staff.id, stamps, purchaseCents });
  if (!result.ok) {
    if (result.reason === "cooldown") {
      return {
        error: `Este cliente ya recibió un sello hace poco. Podrás sellar de nuevo en ${result.minutes} min.`,
        at: Date.now(),
      };
    }
    if (result.reason === "nothing") {
      return {
        error: settings.pointsEnabled
          ? `La compra no alcanza para puntos (se da ${plural(settings.earnPoints, "punto", "puntos")} por cada $${settings.earnAmount}).`
          : "Elige cuántos sellos dar.",
        at: Date.now(),
      };
    }
    return { error: "No encontramos a este cliente.", at: Date.now() };
  }
  refresh();

  const parts: string[] = [];
  if (stamps > 0) parts.push(`+${plural(stamps, "sello", "sellos")}`);
  if (result.pointsAdded > 0) parts.push(`+${plural(result.pointsAdded, "punto", "puntos")}`);
  let message = `Listo: ${parts.join(" y ")}.`;
  if (result.rewardsEarned > 0) {
    const reward = settings.rewardTitle.toLowerCase();
    message +=
      result.rewardsEarned === 1
        ? ` ¡Completó su tarjeta y ganó ${reward}!`
        : ` ¡Completó ${result.rewardsEarned} tarjetas y ganó ${result.rewardsEarned} × ${reward}!`;
  } else if (result.stamps !== null) {
    message += ` Tarjeta: ${result.stamps} de ${settings.stampsRequired}.`;
  }
  if (result.pointsAdded > 0) message += ` Saldo: ${plural(result.points, "punto", "puntos")}.`;
  return { ok: true, message, at: Date.now() };
}

export async function unstampAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  await removeStamp(intField(formData, "customerId"), staff.id);
  refresh();
}

export async function removePointsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const amount = intField(formData, "points");
  if (!(amount >= 1 && amount <= 1_000_000)) return { fieldErrors: { points: "Escribe cuántos puntos restar." } };
  const done = await removePoints(intField(formData, "customerId"), staff.id, amount);
  if (!done) return { fieldErrors: { points: "El cliente no tiene tantos puntos." } };
  refresh();
  return { ok: true, message: `Se restaron ${plural(amount, "punto", "puntos")}.`, at: Date.now() };
}

/**
 * Si el cliente no se identificó escaneando su QR, se pide el código que
 * aparece en su tarjeta para confirmar que es la persona correcta.
 */
async function checkValidationCode(formData: FormData, customerCode: string): Promise<FormState | null> {
  if (formData.get("verified") === "1") return null;
  const code = normalizeCardCode(text(formData, "code"));
  if (code !== customerCode) {
    return {
      fieldErrors: { code: "El código no coincide. Pídele al cliente que te muestre su tarjeta." },
      at: Date.now(),
    };
  }
  return null;
}

export async function redeemStampRewardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const customerId = intField(formData, "customerId");
  const customer = await getCustomerById(customerId);
  if (!customer) return { error: "No encontramos a este cliente.", at: Date.now() };
  const invalid = await checkValidationCode(formData, customer.code);
  if (invalid) return invalid;

  const done = await redeemStampReward(intField(formData, "rewardId"), customerId, staff.id);
  if (!done) return { error: "Este premio ya se había canjeado.", at: Date.now() };
  refresh();
  return { ok: true, message: "Premio canjeado. ¡Entrégalo al cliente!", at: Date.now() };
}

export async function redeemPointsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const customerId = intField(formData, "customerId");
  const customer = await getCustomerById(customerId);
  if (!customer) return { error: "No encontramos a este cliente.", at: Date.now() };
  const invalid = await checkValidationCode(formData, customer.code);
  if (invalid) return invalid;

  const result = await redeemWithPoints(customerId, intField(formData, "itemId"), staff.id);
  if (!result.ok) {
    const errors = {
      insufficient: "Al cliente no le alcanzan los puntos para este premio.",
      inactive: "Este premio ya no está en el catálogo.",
      not_found: "No encontramos el premio.",
    } as const;
    return { error: errors[result.reason], at: Date.now() };
  }
  refresh();
  return {
    ok: true,
    message: `Canjeado: ${result.title}. Le quedan ${plural(result.points, "punto", "puntos")}.`,
    at: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function updateCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const id = intField(formData, "customerId");
  const name = text(formData, "name").replace(/\s+/g, " ");
  const phone = normalizePhone(text(formData, "phone"));
  const birthday = parseBirthday(text(formData, "day"), text(formData, "month"));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 60) fieldErrors.name = "Escribe el nombre.";
  if (!phone) fieldErrors.phone = "El celular debe tener 10 dígitos.";
  if (birthday === "invalid") fieldErrors.birthday = "Revisa el día y el mes.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const result = await updateCustomer(id, { name, phone: phone!, birthday: birthday === "invalid" ? null : birthday });
  if (!result.ok) return { fieldErrors: { phone: "Ese celular ya pertenece a otro cliente." } };
  refresh();
  return { ok: true, message: "Datos guardados.", at: Date.now() };
}

export async function deleteCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const id = intField(formData, "customerId");
  if (text(formData, "confirm").toUpperCase() !== "BORRAR") {
    return { fieldErrors: { confirm: "Escribe BORRAR para confirmar." } };
  }
  await deleteCustomer(id);
  redirect("/panel/clientes?borrado=1");
}

// ---------------------------------------------------------------------------
// Ajustes del programa y equipo
// ---------------------------------------------------------------------------

export async function saveProgramAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const businessName = text(formData, "businessName");
  const rewardTerms = text(formData, "rewardTerms");
  const stampsEnabled = formData.get("stampsEnabled") === "on";
  const pointsEnabled = formData.get("pointsEnabled") === "on";
  const stampsRequired = intField(formData, "stampsRequired");
  const rewardTitle = text(formData, "rewardTitle");
  const welcomeStamps = intField(formData, "welcomeStamps");
  const cooldownMinutes = intField(formData, "cooldownMinutes");
  const earnAmount = intField(formData, "earnAmount");
  const earnPoints = intField(formData, "earnPoints");

  const fieldErrors: Record<string, string> = {};
  if (businessName.length < 2 || businessName.length > 40) fieldErrors.businessName = "De 2 a 40 caracteres.";
  if (rewardTerms.length > 300) fieldErrors.rewardTerms = "Máximo 300 caracteres.";
  if (!stampsEnabled && !pointsEnabled) fieldErrors.programs = "Activa al menos un programa: sellos o puntos.";
  if (!(stampsRequired >= STAMPS_MIN && stampsRequired <= STAMPS_MAX)) {
    fieldErrors.stampsRequired = `Elige entre ${STAMPS_MIN} y ${STAMPS_MAX} sellos.`;
  }
  if (rewardTitle.length < 2 || rewardTitle.length > 60) fieldErrors.rewardTitle = "Escribe la recompensa (2 a 60 letras).";
  if (!(welcomeStamps >= 0 && welcomeStamps < Math.max(stampsRequired, 1))) {
    fieldErrors.welcomeStamps = "Debe ser menor que los sellos de la tarjeta.";
  }
  if (!(cooldownMinutes >= 0 && cooldownMinutes <= 1440)) fieldErrors.cooldownMinutes = "De 0 a 1440 minutos.";
  if (!(earnAmount >= 1 && earnAmount <= 100_000)) fieldErrors.earn = "El monto debe ser de $1 o más.";
  if (!(earnPoints >= 1 && earnPoints <= 10_000)) fieldErrors.earn = "Los puntos deben ser 1 o más.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, at: Date.now() };

  await saveProgram({
    businessName,
    rewardTerms,
    stampsEnabled,
    stampsRequired,
    rewardTitle,
    pointsEnabled,
    welcomeStamps,
    cooldownMinutes,
    earnAmount,
    earnPoints,
  });
  refresh();
  return { ok: true, message: "Programa actualizado.", at: Date.now() };
}

export async function addCatalogItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const title = text(formData, "title");
  const cost = intField(formData, "cost");
  const fieldErrors: Record<string, string> = {};
  if (title.length < 2 || title.length > 60) fieldErrors.title = "Escribe el premio (2 a 60 letras).";
  if (!(cost >= 1 && cost <= 1_000_000)) fieldErrors.cost = "Escribe cuántos puntos cuesta.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, at: Date.now() };
  await addCatalogItem(title, cost);
  refresh();
  return { ok: true, message: `"${title}" agregado al catálogo.`, at: Date.now() };
}

export async function updateCatalogItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const id = intField(formData, "itemId");
  const title = text(formData, "title");
  const cost = intField(formData, "cost");
  const active = formData.get("active") === "on";
  if (title.length < 2 || title.length > 60) return { error: "Escribe el premio (2 a 60 letras).", at: Date.now() };
  if (!(cost >= 1 && cost <= 1_000_000)) return { error: "Escribe cuántos puntos cuesta.", at: Date.now() };
  await updateCatalogItem(id, { title, cost, active });
  refresh();
  return { ok: true, message: "Guardado.", at: Date.now() };
}

export async function addStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const name = text(formData, "name");
  const username = normalizeUsername(text(formData, "username"));
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 60) fieldErrors.name = "Escribe el nombre.";
  const usernameError = validateUsername(username);
  if (usernameError) fieldErrors.username = usernameError;
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const created = await createStaff({ name, username, password, role: "staff" });
  if (!created.ok) return { fieldErrors: { username: created.error } };
  refresh();
  return { ok: true, message: `Listo. ${name} ya puede entrar con el usuario "${username}".`, at: Date.now() };
}

export async function toggleStaffAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const staffId = intField(formData, "staffId");
  if (staffId === owner.id) return;
  await setStaffActive(staffId, formData.get("active") === "1");
  refresh();
}

export async function resetStaffPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const staffId = intField(formData, "staffId");
  const password = String(formData.get("password") ?? "");
  if (staffId === owner.id) return { error: "Cambia tu propia contraseña en la sección Mi cuenta." };
  const passwordError = validatePassword(password);
  if (passwordError) return { fieldErrors: { password: passwordError } };
  await setStaffPassword(staffId, password);
  return { ok: true, message: "Contraseña cambiada. Se cerraron sus sesiones abiertas.", at: Date.now() };
}

export async function changeMyPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!hit(`pw:${staff.id}`, 8, 15 * 60_000)) return { error: "Demasiados intentos. Espera unos minutos." };
  if (!(await verifyPassword(current, await getStaffPasswordHash(staff.id)))) {
    return { fieldErrors: { current: "La contraseña actual no es correcta." } };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { fieldErrors: { password: passwordError } };
  if (password !== confirm) return { fieldErrors: { confirm: "Las contraseñas no coinciden." } };

  const version = await setStaffPassword(staff.id, password);
  await startSession(staff.id, version);
  return { ok: true, message: "Tu contraseña se cambió. Cerramos tus sesiones en otros dispositivos.", at: Date.now() };
}
