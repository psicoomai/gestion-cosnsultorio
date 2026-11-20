"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Button, Field, Input, Textarea, cx } from "@/components/ui";
import { saveProgramAction, type FormState } from "@/lib/actions/panel";
import { LEVEL_MAX_AT, MAX_LEVELS } from "@/lib/stamps";

type LevelRow = { key: number; at: string; title: string };

export type ProgramValues = {
  businessName: string;
  rewardTerms: string;
  stampsEnabled: boolean;
  pointsEnabled: boolean;
  welcomeStamps: number;
  cooldownMinutes: number;
  earnAmount: number;
  earnPoints: number;
  levels: { at: number; title: string }[];
};

function Toggle({
  name,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition",
        checked ? "bg-terracota/[0.06] ring-terracota/40" : "bg-white ring-tinta/15"
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-terracota"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-tinta/60">{description}</span>
      </span>
    </label>
  );
}

export function ProgramForm({ initial }: { initial: ProgramValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveProgramAction, {});
  const [stampsEnabled, setStampsEnabled] = useState(initial.stampsEnabled);
  const [pointsEnabled, setPointsEnabled] = useState(initial.pointsEnabled);
  const [levels, setLevels] = useState<LevelRow[]>(() =>
    initial.levels.map((l, i) => ({ key: i, at: String(l.at), title: l.title }))
  );
  const [nextKey, setNextKey] = useState(initial.levels.length);
  const e = state.fieldErrors ?? {};

  const sortedPreview = levels
    .map((l) => ({ at: Number(l.at), title: l.title.trim() }))
    .filter((l) => Number.isInteger(l.at) && l.at > 0 && l.title)
    .sort((a, b) => a.at - b.at);
  const length = sortedPreview.length ? sortedPreview[sortedPreview.length - 1].at : 0;

  const addLevel = () => {
    const last = Math.max(0, ...levels.map((l) => Number(l.at) || 0));
    setLevels([...levels, { key: nextKey, at: String(Math.min(last + 5, LEVEL_MAX_AT)), title: "" }]);
    setNextKey(nextKey + 1);
  };

  return (
    <ActionForm action={action} className="space-y-6">
      <Field label="Nombre del negocio" htmlFor="businessName" error={e.businessName}>
        <Input id="businessName" name="businessName" defaultValue={initial.businessName} maxLength={40} required />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-tinta/85">Programas activos</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            name="stampsEnabled"
            checked={stampsEnabled}
            onChange={setStampsEnabled}
            label="Tarjeta de sellos por niveles"
            description="Un sello por compra y premios en sellos específicos."
          />
          <Toggle
            name="pointsEnabled"
            checked={pointsEnabled}
            onChange={setPointsEnabled}
            label="Puntos"
            description="Puntos según lo que gasta, para cambiar por premios."
          />
        </div>
        {e.programs ? <p className="text-sm font-medium text-terracota-oscuro">{e.programs}</p> : null}
      </div>

      <fieldset className={cx("space-y-4 rounded-2xl p-4 ring-1 ring-tinta/10 sm:p-5", !stampsEnabled && "opacity-60")}>
        <legend className="px-1 font-sans text-base font-bold">Niveles de la tarjeta de sellos</legend>
        <p className="text-sm text-tinta/60">
          Cada nivel entrega un premio al llegar a ese sello. El nivel más alto completa la tarjeta y vuelve a empezar.
          {length > 0 ? ` Tu tarjeta tiene ${length} sellos.` : ""}
        </p>
        <ul className="space-y-2">
          {levels.map((level, index) => (
            <li key={level.key} className="flex items-center gap-2">
              <div className="relative w-[4.5rem] shrink-0">
                <Input
                  name="levelAt"
                  inputMode="numeric"
                  value={level.at}
                  onChange={(ev) =>
                    setLevels(levels.map((l, i) => (i === index ? { ...l, at: ev.target.value.replace(/\D/g, "") } : l)))
                  }
                  aria-label={`Sello del nivel ${index + 1}`}
                  className="px-2 pr-6 text-center"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-tinta/50">º</span>
              </div>
              <Input
                name="levelTitle"
                value={level.title}
                onChange={(ev) => setLevels(levels.map((l, i) => (i === index ? { ...l, title: ev.target.value } : l)))}
                placeholder="Premio, p. ej. Café gratis"
                maxLength={60}
                aria-label={`Premio del nivel ${index + 1}`}
              />
              <button
                type="button"
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-tinta/50 hover:bg-tinta/5 hover:text-terracota-oscuro"
                onClick={() => setLevels(levels.filter((_, i) => i !== index))}
                aria-label={`Quitar nivel ${index + 1}`}
                title="Quitar nivel"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {e.levels ? <p className="text-sm font-medium text-terracota-oscuro">{e.levels}</p> : null}
        <Button type="button" variant="secondary" size="sm" onClick={addLevel} disabled={levels.length >= MAX_LEVELS}>
          + Agregar nivel
        </Button>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sellos de bienvenida"
            htmlFor="welcomeStamps"
            error={e.welcomeStamps}
            hint="Sellos de regalo al registrarse (0 = ninguno)."
          >
            <Input id="welcomeStamps" name="welcomeStamps" inputMode="numeric" defaultValue={initial.welcomeStamps} />
          </Field>
          <Field
            label="Minutos entre sellos"
            htmlFor="cooldownMinutes"
            error={e.cooldownMinutes}
            hint="Evita sellar dos veces seguidas (0 = sin límite)."
          >
            <Input id="cooldownMinutes" name="cooldownMinutes" inputMode="numeric" defaultValue={initial.cooldownMinutes} />
          </Field>
        </div>
      </fieldset>

      <fieldset className={cx("space-y-3 rounded-2xl p-4 ring-1 ring-tinta/10 sm:p-5", !pointsEnabled && "opacity-60")}>
        <legend className="px-1 font-sans text-base font-bold">Cómo se ganan los puntos</legend>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>El cliente gana</span>
          <div className="w-20">
            <Input name="earnPoints" inputMode="numeric" defaultValue={initial.earnPoints} className="text-center" aria-label="Puntos" />
          </div>
          <span>{"punto(s) por cada $"}</span>
          <div className="w-24">
            <Input name="earnAmount" inputMode="numeric" defaultValue={initial.earnAmount} className="text-center" aria-label="Pesos" />
          </div>
          <span>de compra.</span>
        </div>
        {e.earn ? <p className="text-sm font-medium text-terracota-oscuro">{e.earn}</p> : null}
        <p className="text-sm text-tinta/60">Los premios que se cambian por puntos se configuran en el catálogo de abajo.</p>
      </fieldset>

      <Field
        label="Condiciones de los premios"
        htmlFor="rewardTerms"
        error={e.rewardTerms}
        hint="Aparece en la tarjeta del cliente."
      >
        <Textarea id="rewardTerms" name="rewardTerms" rows={2} maxLength={300} defaultValue={initial.rewardTerms} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Guardando…">Guardar programa</SubmitButton>
        <FormMessage state={state} className="flex-1" />
      </div>
    </ActionForm>
  );
}
