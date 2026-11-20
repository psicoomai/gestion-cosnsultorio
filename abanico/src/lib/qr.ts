import "server-only";
import QRCode from "qrcode";

/** Genera el SVG de un código QR (texto confiable generado por el servidor). */
export async function qrSvg(text: string, options: { dark?: string; light?: string } = {}): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: options.dark ?? "#2a211cff", light: options.light ?? "#00000000" },
  });
}
