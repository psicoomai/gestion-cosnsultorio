import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RegisterPaymentButton } from "@/components/payments/RegisterPaymentButton";
import { NewSessionButton } from "@/components/sessions/NewSessionButton";

// Button ya define justify-center/gap-2/h-10 en sus clases base — se
// sobrescriben aquí con !important porque en CSS generado por Tailwind la
// especificidad la decide el orden de las reglas, no el orden en className.
const actionClassName = "w-full !justify-start !gap-3 !h-12 text-base";

/**
 * Bloque fijo del panel lateral derecho. No debe moverse al header, debajo
 * del dashboard, a un menú desplegable/oculto, ni a botones flotantes.
 */
export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones rápidas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <RegisterPaymentButton initialTab="manual" className={actionClassName}>
          Registrar pago
        </RegisterPaymentButton>
        <RegisterPaymentButton
          initialTab="comprobante"
          variant="secondary"
          className={actionClassName}
        >
          ↑ Subir comprobante
        </RegisterPaymentButton>
        <NewSessionButton variant="secondary" className={actionClassName}>
          Nueva sesión
        </NewSessionButton>
      </CardContent>
    </Card>
  );
}
