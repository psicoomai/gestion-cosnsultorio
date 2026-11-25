/**
 * `true` en la versión de prueba de una sola página (sin servidor): los datos
 * se guardan en el navegador y no hay inicio de sesión. En la app normal
 * (Next.js con servidor) es `false`: cada persona entra con su cuenta.
 */
export const LOCAL_ONLY = process.env.NEXT_PUBLIC_LOCAL_ONLY === "1";
