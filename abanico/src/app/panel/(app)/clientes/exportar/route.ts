import { getCurrentStaff } from "@/lib/auth";
import { formatBirthday } from "@/lib/birthday";
import { formatCardCode } from "@/lib/card-code";
import { allCustomersForExport } from "@/lib/loyalty";
import { APP_TIMEZONE, dayKey } from "@/lib/time";

function csvCell(value: string | number): string {
  let text = String(value);
  // Evita que Excel interprete el contenido como fórmula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Descarga de clientes en CSV (abre directo en Excel). Solo la dueña/o. */
export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "owner") return new Response("No autorizado", { status: 403 });

  const rows = await allCustomersForExport();
  const header = [
    "Nombre",
    "Celular",
    "Cumpleaños",
    "Código de tarjeta",
    "Sellos actuales",
    "Sellos totales",
    "Puntos",
    "Puntos ganados",
    "Saldo a favor (MXN)",
    "Saldo ganado (MXN)",
    "Compras registradas (MXN)",
    "Premios ganados con sellos",
    "Premios canjeados",
    "Registro",
    "Última visita",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const c of rows) {
    lines.push(
      [
        c.name,
        c.phone,
        formatBirthday(c.birthday),
        formatCardCode(c.code),
        c.stamps,
        c.totalStamps,
        c.points,
        c.totalPoints,
        (c.creditCents / 100).toFixed(2),
        (c.totalCreditCents / 100).toFixed(2),
        (c.purchasesCents / 100).toFixed(2),
        c.rewardsEarned,
        c.rewardsRedeemed,
        dayKey(c.createdAt, APP_TIMEZONE),
        c.lastVisitAt ? dayKey(c.lastVisitAt, APP_TIMEZONE) : "",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  // BOM para que Excel reconozca los acentos (UTF-8).
  const body = "﻿" + lines.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${dayKey(Date.now())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
