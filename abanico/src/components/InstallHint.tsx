"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Explica cómo dejar la tarjeta en la pantalla de inicio (y ofrece el botón en Android). */
export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other" | "installed">("other");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setPlatform("installed");
      return;
    }
    const ua = navigator.userAgent;
    setPlatform(/iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "other");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (platform === "installed") return null;

  return (
    <div className="rounded-2xl bg-limon-suave/50 px-5 py-4 text-sm leading-relaxed text-cafe/80">
      <p className="font-semibold text-cafe">Ten tu tarjeta siempre a la mano</p>
      {prompt ? (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => prompt.prompt().finally(() => setPrompt(null))}>
            Agregar a mi pantalla de inicio
          </Button>
        </div>
      ) : platform === "ios" ? (
        <p className="mt-1">
          En Safari toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>. Quedará como una app.
        </p>
      ) : platform === "android" ? (
        <p className="mt-1">
          En Chrome toca el menú <strong>⋮</strong> y luego <strong>Agregar a la pantalla principal</strong>.
        </p>
      ) : (
        <p className="mt-1">Guarda esta página en tus favoritos o agrégala a la pantalla de inicio de tu celular.</p>
      )}
    </div>
  );
}
