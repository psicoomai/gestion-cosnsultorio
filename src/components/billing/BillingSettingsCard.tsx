"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { DEFAULT_REMINDER_TEMPLATE, REMINDER_PLACEHOLDERS } from "@/lib/reminders";

/** Datos para pago, plantilla del recordatorio y política de cancelación. */
export function BillingSettingsCard() {
  const { profile, setProfile } = useClinicData();
  const [paymentDetails, setPaymentDetails] = useState(profile?.paymentDetails ?? "");
  const [template, setTemplate] = useState(profile?.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE);
  const [chargeNoShow, setChargeNoShow] = useState(profile?.chargeNoShow ?? true);
  const [chargeLateCancel, setChargeLateCancel] = useState(profile?.chargeLateCancel ?? true);
  const [saved, setSaved] = useState(false);

  function save(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setProfile({
      ...profile,
      paymentDetails: paymentDetails.trim() || undefined,
      reminderTemplate: template.trim() === DEFAULT_REMINDER_TEMPLATE.trim() ? undefined : template.trim(),
      chargeNoShow,
      chargeLateCancel,
    });
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobranza</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={save} className="flex flex-col gap-4 text-sm" onChange={() => setSaved(false)}>
          <FormField
            label="Tus datos para pago"
            htmlFor="billing-details"
            hint="Aparecen en los recordatorios de WhatsApp y en los estados de cuenta."
          >
            <Textarea
              id="billing-details"
              rows={3}
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder={"Transferencia a BBVA, CLABE 0000 0000 0000 0000 00\nA nombre de Ana López"}
            />
          </FormField>
          <FormField label="Mensaje del recordatorio de pago" htmlFor="billing-template">
            <Textarea id="billing-template" rows={7} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </FormField>
          <div className="text-xs text-dark/55">
            <p className="mb-1">Puedes usar:</p>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
              {REMINDER_PLACEHOLDERS.map(([key, label]) => (
                <li key={key}>
                  <code className="text-dark/75">{key}</code> {label}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2 text-blue-accent"
              onClick={() => {
                setTemplate(DEFAULT_REMINDER_TEMPLATE);
                setSaved(false);
              }}
            >
              Usar el mensaje predeterminado
            </button>
          </div>

          <div className="flex flex-col gap-2 border-t border-dark/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wideish text-dark/60">Política de cancelación</p>
            <label className="flex items-start gap-2">
              <Checkbox checked={chargeNoShow} onChange={(e) => setChargeNoShow(e.target.checked)} className="mt-0.5" />
              <span>Cobrar la sesión cuando el paciente falta sin avisar</span>
            </label>
            <label className="flex items-start gap-2">
              <Checkbox
                checked={chargeLateCancel}
                onChange={(e) => setChargeLateCancel(e.target.checked)}
                className="mt-0.5"
              />
              <span>Cobrar la sesión cuando cancela tarde (fuera del plazo que tú pides)</span>
            </label>
            <p className="text-xs text-dark/55">
              Una cancelación con anticipación nunca se cobra. Esto aplica a las sesiones que marques a partir de
              ahora; las ya registradas conservan su monto.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit">Guardar</Button>
            {saved ? <span className="text-dark/60">Guardado.</span> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
