import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { StatCard } from "@/components/ui/StatCard";
import { themeColors } from "@/lib/theme-colors";

const swatches: { name: string; token: string; hex: string; usage: string }[] = [
  { name: "Oscuro", token: "dark", hex: themeColors.dark, usage: "Texto, navegación, encabezados, contraste" },
  { name: "Fondo", token: "background", hex: themeColors.background, usage: "Fondos y superficies claras" },
  { name: "Azul secundario", token: "blue-secondary", hex: themeColors.blueSecondary, usage: "Elementos informativos" },
  { name: "Azul de acento", token: "blue-accent", hex: themeColors.blueAccent, usage: "Botones, interacción, gráficas" },
  { name: "Naranja de acento", token: "orange-accent", hex: themeColors.orangeAccent, usage: "Atención / diferenciación" },
  { name: "Rojo de adeudo", token: "debt-red", hex: themeColors.debtRed, usage: "Exclusivo: adeudos y saldos pendientes" },
];

export default function GuiaEstiloPage() {
  return (
    <AppShell
      title="Guía de estilo"
      description="Paleta única autorizada y componentes base. Referencia para mantener la identidad visual."
    >
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Paleta de colores</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 pt-0">
            {swatches.map((swatch) => (
              <div key={swatch.token} className="rounded border border-dark/10">
                <div className="h-16 rounded-t" style={{ backgroundColor: swatch.hex }} />
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{swatch.name}</p>
                  <p className="text-xs text-dark/50">
                    {swatch.hex} · --{swatch.token}
                  </p>
                  <p className="mt-1 text-xs text-dark/60">{swatch.usage}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Botones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 pt-0">
            <Button variant="primary">Acción primaria</Button>
            <Button variant="secondary">Acción secundaria</Button>
            <Button variant="ghost">Acción sutil</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distintivos (badges)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 pt-0">
            <Badge variant="neutral">Al corriente</Badge>
            <Badge variant="info">Informativo</Badge>
            <Badge variant="accent">Requiere atención</Badge>
            <Badge variant="debt">Adeudo pendiente</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Alert variant="info" title="Mensaje informativo">
              Usa el azul secundario para contexto general.
            </Alert>
            <Alert variant="accent" title="Requiere atención">
              Usa el naranja para diferenciar sin implicar error.
            </Alert>
            <Alert variant="debt" title="Adeudo pendiente">
              Reserva el rojo únicamente para saldos por cobrar.
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarjetas de indicador</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 pt-0">
            <StatCard label="Cobrado" value="$24,000" />
            <StatCard label="Pendiente" value="$4,000" tone="debt" />
            <StatCard label="Pendiente" value="$0" tone="neutral" hint="Liquidado: sin rojo" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reglas de uso</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-inside list-disc space-y-1.5 text-sm text-dark/80">
              <li>Ningún color fuera de esta paleta, salvo opacidad de los mismos tonos.</li>
              <li>El tono de fondo predomina en superficies claras.</li>
              <li>El rojo de adeudo se reserva exclusivamente para saldos pendientes.</li>
              <li>Un saldo liquidado ($0) nunca conserva una marca roja.</li>
              <li>Todos los tokens se definen una sola vez en <code>src/lib/theme-colors.ts</code>.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
