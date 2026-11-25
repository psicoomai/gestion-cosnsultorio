/** @type {import('next').NextConfig} */
const securityHeaders = [
  // La app no se puede incrustar en otros sitios (evita engaños de "clic oculto").
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Solo tiene efecto cuando la app se sirve por https (en producción).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // PGlite (base de datos local de desarrollo) trae archivos WASM: se carga tal cual en el servidor.
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
