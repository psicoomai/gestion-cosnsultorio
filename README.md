# Gestión de consultorio

Base de la aplicación de gestión de consultorio (pacientes, sesiones y
cobros), con un sistema visual coherente construido sobre una paleta de
colores única. Ver [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) para el detalle
de la identidad visual y las reglas de uso de color.

## Empezar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La ruta `/guia-estilo`
muestra la paleta y los componentes base a modo de referencia viva.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run lint` — lint de Next.js/ESLint.
- `npm run check:colors` — audita el repositorio en busca de cualquier color
  (hex, `rgb()`, `hsl()`) fuera de la paleta autorizada.

## Datos

Las páginas se alimentan de datos de ejemplo en `src/lib/mock-data.ts`. No
hay backend ni autenticación conectados todavía.
