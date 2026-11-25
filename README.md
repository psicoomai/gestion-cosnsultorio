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
- **Asistencia y cancelaciones**: cada sesión se marca como asistió, faltó
  sin avisar, canceló tarde o canceló con anticipación. La política de
  cancelación (Ajustes → Cobranza) decide qué se cobra; lo que no se cobra
  queda en $0 y guarda su costo por si se corrige. La columna "Asistencia" del
  Excel se importa como faltas. Cada paciente muestra su porcentaje de
  asistencia.
- **Agenda semanal**: las sesiones registradas y las que tocan según el
  horario de cada paciente activo (sin vacaciones ni pacientes de baja;
  quincenales cada dos semanas). Cada sesión esperada se registra con un clic:
  asistió, asistió y pagó, faltó o canceló.
- **Pagos**: manual (aplicado a una o varias sesiones) o desde comprobante
  (extracción **simulada**, `src/lib/mock-ocr.ts`); edición y eliminación;
  aviso de posibles duplicados antes de registrar.
- **Cobros**: corte generado/cobrado/pendiente por paciente y mes.
- **Cobranza**: recordatorio de pago por WhatsApp con un clic (el mensaje se
  arma con las sesiones pendientes y tus datos para pago; se revisa antes de
  enviarlo) y **estado de cuenta en PDF** por paciente (pendiente, por año o
  todo el historial). La plantilla del mensaje y los datos para pago se
  configuran en Ajustes.
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
- **Gráficas por año**: en el Corte anual se elige cualquier año (anteriores,
  el actual o el próximo). Muestra el mejor mes, el mes más apretado, el
  promedio mensual (solo meses ya cerrados), una gráfica de cobrado y por
  cobrar por mes con tus vacaciones marcadas, y la comparación mes a mes con
  el año anterior.
- **Vacaciones**: registra tus días sin consulta. Se marcan en el corte
  anual, no se llenan sesiones en esos días desde el horario, y Revisión
  avisa si se registró una sesión dentro de ellas.
- **Ajustes y respaldo**: perfil, cobranza y política de cancelación, cuenta
  (cambiar contraseña, eliminar la cuenta), descargar/restaurar respaldo
  (.json), datos de ejemplo y borrar todo.

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
el Zoom Marketplace) además de las cuentas que ya existen.

## Cuentas y datos

Cada persona **crea su cuenta** (correo y contraseña) y ve solo su consulta,
desde cualquier dispositivo:

- Servidor: rutas de Next.js en `src/app/api/` con la lógica en
  `src/server/` (probada en `src/server/routes.test.ts`).
- Base de datos: PostgreSQL (`DATABASE_URL`). Sin ella, en desarrollo se usa
  PGlite, un PostgreSQL embebido en `.data/pglite`, sin instalar nada.
- Contraseñas con scrypt; sesión en una cookie httpOnly (30 días); bloqueo de
  15 minutos tras 5 intentos fallidos; verificación de origen en todo lo que
  modifica datos; encabezados de seguridad (`next.config.mjs`).
- Los datos de cada consultorio se guardan **cifrados con AES-256-GCM**
  (`DATA_ENCRYPTION_KEY`) y con número de versión: si dos dispositivos guardan
  a la vez, el segundo recibe un aviso en lugar de borrar lo del primero.
- Aviso de privacidad en `/privacidad` (**plantilla**: hay que completarla y
  revisarla con asesoría legal antes de invitar a otras personas) y aceptación
  obligatoria al crear la cuenta. Desde Ajustes se descargan todos los datos
  y se elimina la cuenta.
- Pendiente: recuperar la contraseña por correo (requiere un servicio de
  envío de correos).

## Publicar (Vercel + Neon)

1. En [vercel.com](https://vercel.com), crear cuenta con GitHub e importar
   este repositorio (Add New → Project).
2. En el proyecto: Storage → agregar **Neon (Postgres)**. Esto define
   `DATABASE_URL`.
3. En Settings → Environment Variables, agregar `DATA_ENCRYPTION_KEY` con 64
   caracteres hexadecimales (`openssl rand -hex 32`). Guardarla también en un
   lugar seguro: sin ella los datos guardados no se pueden leer.
4. Desplegar. Ver `.env.example`.

## Versión de prueba (sin instalar nada)

`npm run build:demo` compila la app como una sola página (`out-demo/`) que
funciona sin servidor: la misma app, con un router en memoria en lugar del de
Next.js (`scripts/demo/`) y sin cuentas (`NEXT_PUBLIC_LOCAL_ONLY`): los datos
quedan en el navegador de quien la abre. Se publica como página privada de
claude.ai; ahí las descargas pasan por la confirmación del visor.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm test` — pruebas (Vitest): cálculos, revisión, importador, exportación,
  calendario, periodos de tratamiento, lecturas del año, vacaciones, cobranza,
  asistencia, agenda y la API de cuentas (con PostgreSQL embebido).
- `npm run build:demo` — versión de prueba de una sola página en `out-demo/`.
- `npm run lint` — lint de Next.js/ESLint.
- `npm run check:colors` — audita el repositorio en busca de cualquier color
  (hex, `rgb()`, `hsl()`) fuera de la paleta autorizada.
