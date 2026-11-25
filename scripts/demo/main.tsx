// Punto de entrada de la versión de prueba: las mismas pantallas de la app,
// elegidas según la ruta en memoria.
import "@/app/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClinicDataProvider } from "@/components/providers/ClinicDataProvider";
import DashboardPage from "@/app/page";
import PacientesPage from "@/app/pacientes/page";
import PatientDetailPage from "@/app/pacientes/[id]/page";
import SesionesPage from "@/app/sesiones/page";
import CobrosPage from "@/app/cobros/page";
import TotalesPage from "@/app/totales/page";
import RevisionPage from "@/app/revision/page";
import ImportarPage from "@/app/importar/page";
import AjustesPage from "@/app/ajustes/page";
import VacacionesPage from "@/app/vacaciones/page";
import AgendaPage from "@/app/agenda/page";
import { usePathname } from "./shims/navigation";

const routes: Record<string, () => JSX.Element> = {
  "/": DashboardPage,
  "/pacientes": PacientesPage,
  "/sesiones": SesionesPage,
  "/cobros": CobrosPage,
  "/totales": TotalesPage,
  "/revision": RevisionPage,
  "/importar": ImportarPage,
  "/ajustes": AjustesPage,
  "/vacaciones": VacacionesPage,
  "/agenda": AgendaPage,
};

function App() {
  const path = usePathname();
  const patient = path.match(/^\/pacientes\/([^/]+)$/);
  if (patient) return <PatientDetailPage key={patient[1]} params={{ id: decodeURIComponent(patient[1]) }} />;
  const Page = routes[path] ?? DashboardPage;
  return <Page />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClinicDataProvider>
      <App />
    </ClinicDataProvider>
  </StrictMode>
);
