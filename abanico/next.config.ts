import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: path.resolve(".") },
  // @libsql/client usa binarios nativos para archivos SQLite locales.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
