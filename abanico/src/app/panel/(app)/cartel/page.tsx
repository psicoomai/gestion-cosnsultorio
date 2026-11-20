import type { Metadata } from "next";
import { FanIcon } from "@/components/icons";
import { PrintButton } from "@/components/panel/PrintButton";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/loyalty";
import { programSummary } from "@/lib/program-text";
import { qrSvg } from "@/lib/qr";
import { baseUrl } from "@/lib/url";

export const metadata: Metadata = { title: "Cartel con QR" };

export default async function PosterPage() {
  await requireStaff();
  const [settings, url] = await Promise.all([getSettings(), baseUrl()]);
  const joinUrl = `${url}/unirse`;
  const svg = await qrSvg(joinUrl);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Cartel con QR de registro</h1>
          <p className="mt-1 max-w-xl text-tinta/60">
            Imprímelo y ponlo en caja o en las mesas. Tus clientes lo escanean con la cámara del celular para obtener su
            tarjeta.
          </p>
        </div>
        <PrintButton />
      </div>

      <article className="mx-auto flex w-full max-w-[34rem] flex-col items-center justify-between gap-8 rounded-[2rem] bg-papel px-6 py-10 text-center ring-1 ring-tinta/10 sm:aspect-[1/1.414] sm:px-10 print:aspect-[1/1.414] print:max-w-none print:rounded-none print:ring-0">
        <div className="flex flex-col items-center">
          <FanIcon className="h-14 w-14 text-terracota" />
          <p className="mt-2 font-display text-4xl font-semibold">{settings.businessName}</p>
        </div>
        <div>
          <h2 className="font-display text-[2rem] font-semibold leading-tight">
            Cada visita <span className="italic text-terracota">suma</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-tinta/75">{programSummary(settings)}</p>
        </div>
        <div
          className="aspect-square w-[58%] rounded-3xl bg-white p-4 ring-1 ring-tinta/10 [&_svg]:h-full [&_svg]:w-full"
          role="img"
          aria-label={`Código QR para registrarse: ${joinUrl}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div>
          <p className="text-lg font-semibold">Escanea y obtén tu tarjeta</p>
          <p className="mt-1 text-sm text-tinta/55">Sin app · Tarda menos de un minuto</p>
          <p className="mt-3 font-mono text-xs text-tinta/45">{joinUrl.replace(/^https?:\/\//, "")}</p>
        </div>
      </article>
    </div>
  );
}
