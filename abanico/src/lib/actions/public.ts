"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseBirthday } from "@/lib/birthday";
import { CARD_COOKIE, CARD_COOKIE_MAX_AGE_S } from "@/lib/card-cookie";
import { createCustomer, getCustomerByToken } from "@/lib/loyalty";
import { normalizePhone } from "@/lib/phone";
import { clientIp, hit } from "@/lib/rate-limit";

export type JoinState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "birthday" | "consent", string>>;
  values?: { name: string; phone: string; day: string; month: string };
};

async function setCardCookie(token: string) {
  const jar = await cookies();
  jar.set(CARD_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CARD_COOKIE_MAX_AGE_S,
  });
}

export async function joinProgram(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const values = {
    name: String(formData.get("name") ?? "").trim().replace(/\s+/g, " "),
    phone: String(formData.get("phone") ?? "").trim(),
    day: String(formData.get("day") ?? ""),
    month: String(formData.get("month") ?? ""),
  };
  const fieldErrors: JoinState["fieldErrors"] = {};

  if (values.name.length < 2) fieldErrors.name = "Escribe tu nombre.";
  else if (values.name.length > 60) fieldErrors.name = "El nombre es demasiado largo.";

  const phone = normalizePhone(values.phone);
  if (!phone) fieldErrors.phone = "Escribe tu celular a 10 dígitos.";

  const birthday = parseBirthday(values.day, values.month);
  if (birthday === "invalid") fieldErrors.birthday = "Revisa el día y el mes de tu cumpleaños.";

  if (formData.get("consent") !== "on") fieldErrors.consent = "Necesitamos tu autorización para crear tu tarjeta.";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  if (!hit(`join:${await clientIp()}`, 10, 10 * 60_000)) {
    return { error: "Demasiados registros desde este dispositivo. Intenta de nuevo en unos minutos.", values };
  }

  const result = await createCustomer({
    name: values.name,
    phone: phone!,
    birthday: birthday === "invalid" ? null : birthday,
  });
  if (!result.ok) {
    return {
      fieldErrors: {
        phone:
          "Este celular ya tiene una tarjeta. Pide en caja que te la manden por WhatsApp para recuperarla.",
      },
      values,
    };
  }

  await setCardCookie(result.customer.token);
  redirect(`/tarjeta/${result.customer.token}?bienvenida=1`);
}

/** Guarda en este dispositivo la tarjeta que se abrió (p. ej. desde WhatsApp). */
export async function rememberCard(token: string): Promise<void> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return;
  const jar = await cookies();
  if (jar.get(CARD_COOKIE)?.value === token) return;
  const customer = await getCustomerByToken(token);
  if (customer) await setCardCookie(token);
}

/** Olvida la tarjeta guardada en este dispositivo. */
export async function forgetCard(): Promise<void> {
  const jar = await cookies();
  jar.delete(CARD_COOKIE);
  redirect("/");
}
