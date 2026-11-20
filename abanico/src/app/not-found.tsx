import Link from "next/link";
import { FanIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <FanIcon className="h-16 w-16 text-terracota/40" />
      <h1 className="mt-6 text-3xl font-semibold">No encontramos esta página</h1>
      <p className="mt-3 text-tinta/65">
        Si buscabas tu tarjeta de sellos, pide en caja que te la manden de nuevo por WhatsApp.
      </p>
      <Link href="/" className={buttonClass("primary", "md", "mt-8")}>
        Ir al inicio
      </Link>
    </main>
  );
}
