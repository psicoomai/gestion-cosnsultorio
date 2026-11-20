import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default async function PrivacyPage() {
  await connection();
  const settings = await getSettings();
  const name = settings.businessName;
  const contact = process.env.PRIVACY_CONTACT_EMAIL?.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8">
      <header>
        <Link href="/" aria-label="Inicio">
          <Logo name={name} />
        </Link>
      </header>
      <main className="py-10">
        <h1 className="text-3xl font-semibold">Aviso de privacidad</h1>
        <div className="mt-6 space-y-5 leading-relaxed text-cafe/80">
          <p>
            <strong>{name}</strong> es responsable del tratamiento de los datos personales que nos proporcionas al
            registrarte en nuestro programa de lealtad, conforme a la Ley Federal de Protección de Datos Personales en
            Posesión de los Particulares.
          </p>
          <section>
            <h2 className="font-sans text-base font-semibold text-cafe">Datos que recabamos</h2>
            <p className="mt-1">Tu nombre, tu número de celular y, si nos lo das, el día y mes de tu cumpleaños.</p>
          </section>
          <section>
            <h2 className="font-sans text-base font-semibold text-cafe">Para qué los usamos</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Identificar tu tarjeta de sellos y registrar tus visitas y recompensas.</li>
              <li>Enviarte tu tarjeta o avisos sobre tus recompensas por WhatsApp, si así lo solicitas.</li>
              <li>Consentirte en tu cumpleaños, si nos compartiste la fecha.</li>
            </ul>
            <p className="mt-2">No vendemos ni compartimos tus datos con terceros para fines de publicidad.</p>
          </section>
          <section>
            <h2 className="font-sans text-base font-semibold text-cafe">Tus derechos</h2>
            <p className="mt-1">
              Puedes pedir en cualquier momento acceder a tus datos, corregirlos, cancelarlos u oponerte a su uso (derechos
              ARCO), así como revocar tu consentimiento. Para hacerlo, solicítalo directamente en caja
              {contact ? (
                <>
                  {" "}o escríbenos a{" "}
                  <a className="font-semibold text-cafe underline" href={`mailto:${contact}`}>
                    {contact}
                  </a>
                </>
              ) : null}
              . Al cancelar tus datos se elimina tu tarjeta y los sellos acumulados.
            </p>
          </section>
          <p className="text-sm text-cafe/55">Cualquier cambio a este aviso se publicará en esta misma página.</p>
        </div>
      </main>
    </div>
  );
}
