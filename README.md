# Gestión de consultorio

Aplicación de gestión de consultorio: pacientes, sesiones y cobros, con un
sistema visual coherente construido sobre una paleta de colores única. Ver
[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) para el detalle de la identidad
visual y las reglas de uso de color.

## Empezar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Funcionalidad

- **Pacientes**: alta de pacientes (frecuencia de sesiones y modalidad de
  pago son campos independientes; el costo siempre es por sesión), listado
  con totales del mes y totales históricos, y página individual por
  paciente con selector de mes.
- **Sesiones**: cada sesión conserva su propio costo histórico — cambiar la
  tarifa de un paciente nunca reescribe sesiones pasadas.
- **Cobros**: corte generado/cobrado/pendiente por paciente y por mes.
- **Registrar pago**: manualmente (aplicado a una o varias sesiones) o
  subiendo un comprobante. La extracción de datos del comprobante está
  **simulada** (`src/lib/mock-ocr.ts`) — no hay un servicio real de
  OCR/visión conectado; sustituir antes de producción. En ambos casos se
  muestra una vista previa editable y se detectan posibles pagos duplicados
  antes de registrar nada — nunca se registra sin confirmación explícita.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run lint` — lint de Next.js/ESLint.
- `npm run check:colors` — audita el repositorio en busca de cualquier color
  (hex, `rgb()`, `hsl()`) fuera de la paleta autorizada.

## Datos

Todavía no hay backend ni base de datos. `ClinicDataProvider`
(`src/components/providers/ClinicDataProvider.tsx`) parte de la semilla en
`src/lib/mock-data.ts` y mantiene pacientes, sesiones y pagos en memoria
mientras dura la sesión del navegador — los cambios (agregar paciente,
registrar pago) se pierden al recargar la página. Todos los totales se
calculan siempre desde las sesiones y los pagos reales
(`src/lib/metrics.ts`), nunca se guardan como campos sueltos.
