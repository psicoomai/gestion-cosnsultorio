// Utilidades HTTP para las rutas de la API: respuestas JSON, errores con
// mensaje en español, lectura de cuerpo con límite de tamaño, verificación de
// origen (protección CSRF) y cookies de sesión.

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error"
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** Ejecuta un manejador y convierte cualquier error en una respuesta JSON. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
    console.error("[consultorio] error inesperado:", err);
    return json({ error: "Ocurrió un error en el servidor. Intenta de nuevo.", code: "server_error" }, 500);
  }
}

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new HttpError(413, "La información enviada es demasiado grande.", "too_large");
  }
  try {
    const value = JSON.parse(text);
    if (typeof value !== "object" || value === null) throw new Error();
    return value as T;
  } catch {
    throw new HttpError(400, "La solicitud no es válida.", "bad_request");
  }
}

function requestHost(request: Request): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
}

/**
 * Las peticiones que cambian algo deben venir de la propia app: el
 * navegador siempre manda `Origin` en un fetch POST/PUT/DELETE, y se compara
 * con el host al que llegó la petición.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new HttpError(403, "Solicitud rechazada.", "bad_origin");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Solicitud rechazada.", "bad_origin");
  }
  if (originHost !== requestHost(request)) throw new HttpError(403, "Solicitud rechazada.", "bad_origin");
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function isSecure(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return proto === "https";
}

export function cookieHeader(request: Request, name: string, value: string, maxAgeSeconds: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isSecure(request)) parts.push("Secure");
  return parts.join("; ");
}
