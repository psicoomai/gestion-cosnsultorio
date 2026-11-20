import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Abanico · Tarjeta de sellos",
    short_name: "Abanico",
    description: "Tu tarjeta de sellos de Abanico.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe4",
    theme_color: "#f6efe4",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
