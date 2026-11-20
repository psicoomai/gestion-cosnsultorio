import type { Metadata } from "next";
import Link from "next/link";
import { ProgramForm } from "@/components/panel/ProgramForm";
import {
  AddCatalogItemForm,
  AddStaffForm,
  CatalogItemRow,
  ChangePasswordForm,
  StaffRow,
} from "@/components/panel/SettingsForms";
import { Card, Notice } from "@/components/ui";
import { listStaff, requireStaff } from "@/lib/auth";
import { getSettings, listCatalog } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ inicio?: string }> }) {
  const staff = await requireStaff();
  const { inicio } = await searchParams;
  const isOwner = staff.role === "owner";
  const [settings, catalog, team] = await Promise.all([
    getSettings(),
    isOwner ? listCatalog() : Promise.resolve([]),
    isOwner ? listStaff() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Ajustes</h1>
        <p className="mt-1 text-tinta/60">
          {isOwner ? "Configura tu programa de lealtad y a tu equipo." : "Tu cuenta del panel."}
        </p>
      </div>

      {inicio ? (
        <Notice tone="success">
          <strong>¡Tu cuenta está lista!</strong> Revisa los niveles de sellos y el catálogo de puntos (vienen con ejemplos),
          da de alta a tu equipo e imprime el{" "}
          <Link href="/panel/cartel" className="font-semibold underline">
            cartel con el QR
          </Link>{" "}
          para que tus clientes se registren.
        </Notice>
      ) : null}

      {isOwner ? (
        <>
          <Card>
            <h2 className="mb-5 text-2xl font-semibold">Programa</h2>
            <ProgramForm
              initial={{
                businessName: settings.businessName,
                rewardTerms: settings.rewardTerms,
                stampsEnabled: settings.stampsEnabled,
                pointsEnabled: settings.pointsEnabled,
                welcomeStamps: settings.welcomeStamps,
                cooldownMinutes: settings.cooldownMinutes,
                earnAmount: settings.earnAmount,
                earnPoints: settings.earnPoints,
                levels: settings.levels.map(({ at, title }) => ({ at, title })),
              }}
            />
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold">Catálogo de puntos</h2>
            <p className="mt-1 text-sm text-tinta/60">
              Premios que tus clientes pueden cambiar por puntos. Desmarca “Visible” para ocultar uno sin borrarlo.
            </p>
            {catalog.length > 0 ? (
              <div className="mt-3 divide-y divide-tinta/10">
                {catalog.map((item) => (
                  <CatalogItemRow key={item.id} item={item} />
                ))}
              </div>
            ) : null}
            <div className="mt-4 border-t border-tinta/10 pt-4">
              <AddCatalogItemForm />
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold">Equipo</h2>
            <p className="mt-1 text-sm text-tinta/60">
              Cada persona entra con su usuario para registrar compras y canjear premios. Solo tú puedes cambiar el
              programa, borrar clientes y exportar datos.
            </p>
            <ul className="mt-3 divide-y divide-tinta/10">
              {team.map((member) => (
                <StaffRow key={member.id} member={member} isSelf={member.id === staff.id} />
              ))}
            </ul>
            <div className="mt-4 border-t border-tinta/10 pt-4">
              <h3 className="mb-3 font-sans text-base font-bold">Agregar a alguien del equipo</h3>
              <AddStaffForm />
            </div>
          </Card>
        </>
      ) : null}

      <Card>
        <h2 className="text-2xl font-semibold">Mi cuenta</h2>
        <p className="mb-4 mt-1 text-sm text-tinta/60">
          {staff.name} · usuario <strong>{staff.username}</strong>
        </p>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
