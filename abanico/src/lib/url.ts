import "server-only";
import { headers } from "next/headers";

/** URL pública de la app, para QR y enlaces de WhatsApp. */
export async function baseUrl(): Promise<string> {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function cardUrl(token: string): Promise<string> {
  return `${await baseUrl()}/tarjeta/${token}`;
}
