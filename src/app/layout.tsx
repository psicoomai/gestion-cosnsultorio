import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import { ClinicDataProvider } from "@/components/providers/ClinicDataProvider";
import "./globals.css";

const editorial = Lora({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Consultorio — Gestión clínica",
  description: "Gestión de pacientes, sesiones y cobros del consultorio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${editorial.variable} ${body.variable}`}>
      <body>
        <ClinicDataProvider>{children}</ClinicDataProvider>
      </body>
    </html>
  );
}
