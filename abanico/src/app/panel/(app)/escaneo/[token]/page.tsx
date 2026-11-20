import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getCustomerByToken } from "@/lib/loyalty";

/** Destino del escáner: busca la tarjeta por su token y abre la ficha del cliente. */
export default async function ScanResultPage({ params }: { params: Promise<{ token: string }> }) {
  await requireStaff();
  const { token } = await params;
  const customer = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await getCustomerByToken(token) : null;
  if (!customer) redirect("/panel/sellar?error=no-encontrada");
  redirect(`/panel/clientes/${customer.id}?escaneo=1`);
}
