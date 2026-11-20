"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { ScanIcon } from "@/components/icons";
import { Button, Notice } from "@/components/ui";
import { tokenFromScan } from "@/lib/card-code";

type DetectorLike = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

type Status = "idle" | "starting" | "scanning" | "found" | "error";

/**
 * Escáner de QR con la cámara del celular. Usa BarcodeDetector cuando el
 * navegador lo tiene (Chrome/Android) y jsQR en los demás (Safari/iPhone).
 */
export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setMessage(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("La cámara solo funciona con una conexión segura (https). Busca al cliente por nombre o celular.");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");

      const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (o: object) => DetectorLike })
        .BarcodeDetector;
      let detector: DetectorLike | null = null;
      if (BarcodeDetectorCtor) {
        try {
          detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
        } catch {
          detector = null;
        }
      }
      const canvas = (canvasRef.current ??= document.createElement("canvas"));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let busy = false;

      const handle = (text: string) => {
        const token = tokenFromScan(text);
        if (!token) {
          setMessage("Ese código no es una tarjeta de lealtad. Intenta con el QR de la tarjeta del cliente.");
          return false;
        }
        setStatus("found");
        navigator.vibrate?.(60);
        stop();
        router.push(`/panel/escaneo/${token}`);
        return true;
      };

      const tick = async () => {
        if (!streamRef.current) return;
        if (!busy && video.readyState >= 2 && video.videoWidth > 0) {
          busy = true;
          try {
            if (detector) {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue && handle(codes[0].rawValue)) return;
            } else if (ctx) {
              const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
              if (code?.data && handle(code.data)) return;
            }
          } catch {
            // Un cuadro que no se pudo leer: seguimos con el siguiente.
          } finally {
            busy = false;
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      stop();
      setStatus("error");
      const name = error instanceof DOMException ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "No diste permiso para usar la cámara. Actívalo en los ajustes del navegador o busca al cliente abajo."
          : name === "NotFoundError"
            ? "Este dispositivo no tiene cámara. Busca al cliente por nombre, celular o código."
            : "No se pudo abrir la cámara. Busca al cliente por nombre, celular o código."
      );
    }
  }, [router, stop]);

  const active = status === "starting" || status === "scanning" || status === "found";

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.6rem] bg-cafe sm:aspect-[4/3]">
        <video
          ref={videoRef}
          className={active ? "h-full w-full object-cover" : "hidden"}
          playsInline
          muted
          aria-label="Vista de la cámara"
        />
        {active ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[62%] w-[62%] rounded-3xl border-4 border-papel/90 shadow-[0_0_0_9999px_rgb(60_36_21/0.4)]" />
            <p className="absolute bottom-4 rounded-full bg-limon px-4 py-1.5 text-sm font-semibold text-cafe">
              {status === "found" ? "¡Tarjeta encontrada!" : status === "starting" ? "Abriendo cámara…" : "Apunta al QR del cliente"}
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-crema">
            <ScanIcon className="h-14 w-14 text-limon" />
            <p className="max-w-xs text-sm text-crema/75">Escanea el código QR que aparece en la tarjeta del cliente.</p>
            <Button size="lg" variant="reward" onClick={start}>
              Escanear tarjeta
            </Button>
          </div>
        )}
      </div>
      {active && status !== "found" ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            stop();
            setStatus("idle");
          }}
        >
          Cerrar cámara
        </Button>
      ) : null}
      {message ? <Notice tone="error">{message}</Notice> : null}
    </div>
  );
}
