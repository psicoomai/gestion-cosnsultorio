"use client";

import { useEffect } from "react";
import { rememberCard } from "@/lib/actions/public";

/** Guarda la tarjeta en este dispositivo para que la próxima vez abra directo. */
export function RememberCard({ token }: { token: string }) {
  useEffect(() => {
    rememberCard(token).catch(() => {});
  }, [token]);
  return null;
}
