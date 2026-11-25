// Descarga un archivo generado en el navegador (respaldo, Excel, calendario).
//
// Dentro de la versión de prueba publicada en claude.ai la página corre en
// un marco que bloquea las descargas directas; ahí se usa la capacidad
// `downloads` del visor (pide confirmación a la persona). En cualquier otro
// lugar se usa un enlace de descarga normal.

interface DownloadsCapability {
  save(request: { filename: string; data: Blob }): Promise<{ status: string }>;
}

interface ClaudeHost {
  use(name: "downloads"): Promise<DownloadsCapability | null>;
}

function claudeHost(): ClaudeHost | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { claude?: ClaudeHost }).claude;
}

export type DownloadResult = "ok" | "cancelled" | "unavailable";

export async function downloadBlob(blob: Blob, filename: string): Promise<DownloadResult> {
  const host = claudeHost();
  if (host?.use) {
    const downloads = await host.use("downloads").catch(() => null);
    if (!downloads) return "unavailable";
    try {
      await downloads.save({ filename, data: blob });
      return "ok";
    } catch (err) {
      const code = (err as { code?: string })?.code;
      return code === "declined" ? "cancelled" : "unavailable";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "ok";
}
