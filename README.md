# Gestión de consultorio

Plataforma web para que psicólogas, psicólogos y cualquier profesional que
cobra por sesión lleve sus pacientes, sesiones y pagos **sin que las cuentas
se descuadren**. Nació de un Excel real (una hoja por paciente + una hoja
TOTALES) en el que los totales dejaban de cuadrar por errores de captura y
fórmulas mantenidas a mano.

Ver [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) para la identidad visual y las
reglas de uso de color.

## Empezar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La primera vez pide tu
nombre y cómo empezar: importar tu Excel, empezar desde cero o explorar con
datos de ejemplo.

## Por qué ya no se descuadra

Los errores típicos de una hoja de cálculo de consultorio y qué hace la app
con cada uno:

| Error en Excel | Aquí |
| --- | --- |
| Un paciente nuevo no se agregó a la fórmula de COBRADO o POR COBRAR | Imposible: los totales suman **todas** las sesiones, no una lista de hojas. |
| Un rango de filas del mes se encima con el siguiente (una sesión cuenta dos veces) | Imposible: cada sesión cae en el mes de **su fecha**. |
| El total de un paciente solo suma uno o dos meses | Imposible: no hay rangos que mantener. |
| Año mal escrito (2025 en vez de 2026), fecha como texto, celdas combinadas | El importador los detecta, los explica y ofrece corregirlos. |
| Pago registrado dos veces, dinero que no quedó ligado a ninguna sesión | La sección **Revisión** lo señala automáticamente. |

Todos los totales se calculan desde las sesiones y los pagos reales
(`src/lib/metrics.ts`); nunca se guardan como campos sueltos. El corte anual
muestra el **cuadre**: cobrado sumado por pacientes, por meses y directo, con
su diferencia (debe ser $0).

## Funcionalidad

- **Pacientes**: alta, edición y baja. La casilla **"Ya no viene a terapia"**
  pide la fecha en que dejó de venir; desde el mes siguiente deja de aparecer
  en los cortes mensuales (Panel, Cobros), sin perder su historial ni sus
  adeudos. Si regresa, se desmarca indicando la fecha de regreso y el periodo
  anterior queda guardado. La lista sugiere marcar a quienes llevan más de 60
  días sin sesiones.
- **Horario por paciente**: días y horas habituales, duración y enlace de
  videollamada (Zoom, Meet…). Sirve para llenar las sesiones del mes con un
  clic y para agregarlas a Google Calendar (ver abajo). Nunca crea sesiones
  por sí solo.
- **Sesiones**: registrar una o varias a la vez (opcionalmente ya pagadas),
  editar fecha/costo/nota y eliminar. Cada sesión conserva su costo histórico.
- **Pagos**: manual (aplicado a una o varias sesiones) o desde comprobante
  (extracción **simulada**, `src/lib/mock-ocr.ts`); edición y eliminación;
  aviso de posibles duplicados antes de registrar.
- **Cobros**: corte generado/cobrado/pendiente por paciente y mes.
- **Corte anual**: equivalente a la hoja TOTALES — Real, Cobrado y Por cobrar,
  ingresos por mes, tabla paciente × mes y cuadre. **Descargar Excel** genera
  un libro con TOTALES + una hoja por paciente cuyas fórmulas no pueden
  descuadrarse (meses con `SUMIFS` por fecha, TOTALES desde una tabla con una
  fila por paciente y una celda DIFERENCIA que debe dar 0).
- **Revisión**: pagos sin aplicar, duplicados, sesiones repetidas, fechas
  aisladas (año mal escrito), sesiones futuras, fechas de pago extrañas,
  sesiones después de que el paciente dejó de venir, adeudos de más de 30
  días y sesiones en $0.
- **Importar Excel**: lee un libro "una hoja por paciente" (encabezados
  reconocidos por nombre, no por posición) y hojas de plataforma tipo Spring
  Health ("MES DONDE CORRESPONDE"). Ignora TOTALES/PLANTILLA, muestra una
  vista previa con totales y avisos, y puede volver a importarse el mismo
  archivo sin duplicar. Todo se lee en el navegador.
- **Ajustes y respaldo**: perfil, descargar/restaurar respaldo (.json),
  datos de ejemplo y borrar todo.

## Calendario y videollamadas

Hoy, sin cuentas ni contraseñas:

- **Agregar a Google Calendar** (ficha del paciente): abre Google Calendar con
  el evento recurrente ya prellenado (día, hora, duración, frecuencia y
  enlace de videollamada); solo hay que guardarlo.
- **Descargar horario (.ics)** (Pacientes): un calendario con todos los
  pacientes activos que se importa en Google Calendar, Apple Calendar u
  Outlook.

Lo que requiere un paso más (y una decisión de quien opera la plataforma):
sincronización automática en ambos sentidos con Google Calendar (p. ej. que
cada evento atendido se registre como sesión) y crear reuniones de Zoom
desde la app. Ambas necesitan OAuth (un proyecto en Google Cloud y una app en
el Zoom Marketplace) y un servidor que guarde los tokens de cada persona, así
que van junto con las cuentas de usuario (ver "Datos").

## Datos

Los datos se guardan **solo en el navegador** de quien usa la app
(IndexedDB, `src/lib/storage.ts`): no se envían a ningún servidor. Cada
persona que abre la plataforma tiene sus propios datos, privados, en su
dispositivo. La contracara: no se sincronizan entre dispositivos y se
pierden si se borran los datos del navegador — por eso **Ajustes → Descargar
respaldo**.

Toda la app habla con la interfaz `ClinicStore`; para agregar cuentas de
usuario y sincronización en la nube basta con una implementación remota
(p. ej. una API con base de datos y autenticación) sin tocar pantallas ni
cálculos.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm test` — pruebas (Vitest): cálculos, revisión, importador, exportación,
  calendario y periodos de tratamiento.
- `npm run lint` — lint de Next.js/ESLint.
- `npm run check:colors` — audita el repositorio en busca de cualquier color
  (hex, `rgb()`, `hsl()`) fuera de la paleta autorizada.
