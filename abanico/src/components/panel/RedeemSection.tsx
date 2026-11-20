"use client";

import { ActionForm } from "@/components/ActionForm";
import { useActionState, useState } from "react";
import { GiftIcon } from "@/components/icons";
import { FormMessage } from "@/components/panel/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Input, cx } from "@/components/ui";
import { redeemPointsAction, redeemStampRewardAction, type FormState } from "@/lib/actions/panel";

const fmt = new Intl.NumberFormat("es-MX");

type PendingReward = { id: number; title: string; earnedAt: string };
type CatalogItem = { id: number; title: string; cost: number };

/**
 * Canje de premios. Si el cliente no llegó escaneando su QR, se pide el
 * código de validación que aparece en su tarjeta.
 */
export function RedeemSection({
  customerId,
  verified,
  pending,
  catalog,
  points,
  pointsEnabled,
}: {
  customerId: number;
  verified: boolean;
  pending: PendingReward[];
  catalog: CatalogItem[];
  points: number;
  pointsEnabled: boolean;
}) {
  const [code, setCode] = useState("");
  const [stampState, stampAction] = useActionState<FormState, FormData>(redeemStampRewardAction, {});
  const [pointsState, pointsAction] = useActionState<FormState, FormData>(redeemPointsAction, {});
  const latest = (stampState.at ?? 0) > (pointsState.at ?? 0) ? stampState : pointsState;
  const codeError = latest.fieldErrors?.code;
  const hasSomething = pending.length > 0 || (pointsEnabled && catalog.length > 0);
  if (!hasSomething) return null;

  const hidden = (
    <>
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="verified" value={verified ? "1" : "0"} />
      <input type="hidden" name="code" value={code} />
    </>
  );

  return (
    <div className="space-y-4">
      {!verified ? (
        <Field
          label="Código de validación"
          htmlFor="redeem-code"
          error={codeError}
          hint="Pídele al cliente el código de 6 caracteres que aparece en su tarjeta."
        >
          <Input
            id="redeem-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC-123"
            autoComplete="off"
            autoCapitalize="characters"
            className="font-mono tracking-widest"
            maxLength={8}
          />
        </Field>
      ) : null}

      {pending.length > 0 ? (
        <ul className="space-y-2">
          {pending.map((reward) => (
            <li key={reward.id} className="flex items-center gap-3 rounded-2xl bg-limon/20 px-4 py-3 ring-1 ring-limon/60">
              <GiftIcon className="h-6 w-6 shrink-0 text-cafe/70" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{reward.title}</p>
                <p className="text-xs text-cafe/60">Ganado con sellos · {reward.earnedAt}</p>
              </div>
              <ActionForm action={stampAction}>
                {hidden}
                <input type="hidden" name="rewardId" value={reward.id} />
                <SubmitButton variant="reward" size="sm" pendingText="…">
                  Canjear
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : null}

      {pointsEnabled && catalog.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-cafe/85">
            Canjear con puntos <span className="font-normal text-cafe/55">· saldo {fmt.format(points)} pts</span>
          </p>
          <ul className="space-y-2">
            {catalog.map((item) => {
              const enough = points >= item.cost;
              return (
                <li
                  key={item.id}
                  className={cx(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 ring-1",
                    enough ? "bg-azul/15 ring-azul" : "bg-papel ring-cafe/10"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{item.title}</p>
                    <p className="text-xs text-cafe/60">
                      {fmt.format(item.cost)} pts
                      {enough ? "" : ` · le faltan ${fmt.format(item.cost - points)}`}
                    </p>
                  </div>
                  <ActionForm action={pointsAction}>
                    {hidden}
                    <input type="hidden" name="itemId" value={item.id} />
                    <SubmitButton variant={enough ? "primary" : "secondary"} size="sm" pendingText="…" disabled={!enough}>
                      Canjear
                    </SubmitButton>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <FormMessage state={latest} />
    </div>
  );
}
