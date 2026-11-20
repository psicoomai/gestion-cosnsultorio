import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Abanico · Tarjeta de sellos",
    template: "%s · Abanico",
  },
  description: "Junta sellos en cada visita a Abanico y gana tu recompensa.",
  applicationName: "Abanico",
  appleWebApp: { capable: true, title: "Abanico", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f6efe4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
