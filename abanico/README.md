# Abanico · Programa de lealtad

Plataforma de lealtad para **Abanico**: tarjeta de sellos por niveles y puntos,
en el celular del cliente, sin app y sin cartón. El equipo escanea la tarjeta
con la cámara del celular, suma sellos y puntos, y canjea premios.

## Qué hace

**Para tus clientes**

- Se registran escaneando un QR en caja: nombre, celular y (opcional) cumpleaños.
- Reciben su tarjeta digital con su propio QR y un código corto de validación.
- Ven sus sellos, sus puntos, sus premios y su historial; la tarjeta se
  actualiza sola en cuanto el equipo registra la compra.
- Pueden agregarla a la pantalla de inicio (funciona como app).

**Dos programas, juntos o por separado** (se eligen en Ajustes)

- **Tarjeta de sellos por niveles**: un premio en sellos específicos, por
  ejemplo 5.º sello café con −25 %, 12.º café gratis, 25.º taza con el logo.
  Al llegar al último nivel la tarjeta vuelve a empezar. Si quieres la tarjeta
  clásica, deja un solo nivel (p. ej. 10.º sello: bebida gratis).
- **Puntos**: el cliente gana puntos según lo que gasta (p. ej. 1 punto por
  cada $10) y los cambia por premios de un catálogo (café por 100 puntos,
  sándwich por 500…).

**Para tu equipo (Caja)**

- Escanea el QR del cliente (o búscalo por nombre, celular o código).
- Un solo formulario por compra: sellos + monto de la compra → un botón.
- Canje de premios ganados con sellos y canje de premios con puntos. Si el
  cliente no se identificó escaneando, se pide su código de validación.
- Correcciones: quitar un sello o restar puntos.
- Mandar la tarjeta por WhatsApp si el cliente cambió de celular.

**Para la dueña o el dueño**

- Panel: clientes, visitas y sellos de hoy, puntos y compras de la semana,
  premios canjeados, % de clientes que regresan, gráfica de 14 días, actividad
  reciente, quién está a punto de ganar, mejores clientes, clientes que no han
  vuelto (con botón de WhatsApp) y cumpleaños del mes.
- Ajustes del programa, catálogo de puntos y cuentas del equipo.
- Exportar clientes a Excel (CSV).
- Cartel imprimible con el QR de registro.
- Antiabuso opcional: minutos mínimos entre sellos.

## Probarlo en tu computadora

Necesitas Node.js 20 o más reciente.

```bash
cd abanico
npm install
npm run dev
```

Abre <http://localhost:3000>. La primera vez entra a
<http://localhost:3000/panel>: te pedirá crear la cuenta de la dueña o dueño.
En desarrollo no se pide código de configuración.

Los datos se guardan en `abanico/data/abanico.db` (SQLite). Para empezar de
cero, borra ese archivo.

> La cámara del navegador solo funciona en `localhost` o con `https`. Para
> probar el escáner desde tu celular necesitas publicar la app (abajo) o usar
> un túnel https.

## Publicarlo

La app es Next.js y guarda todo en una base de datos SQLite (libSQL). Hay dos
caminos:

### Opción A · Un servidor con disco (Railway, Render, Fly.io, un VPS)

1. Sube el proyecto con la carpeta `abanico` como raíz.
2. Build: `npm install && npm run build`. Inicio: `npm start`.
3. Monta un disco persistente y apunta la base ahí, por ejemplo
   `DATABASE_URL=file:/data/abanico.db`.
4. Define `SETUP_CODE` (cualquier texto secreto) y entra a `/panel` para crear
   tu cuenta con ese código.

### Opción B · Vercel + Turso

Vercel no tiene disco persistente, así que la base va en
[Turso](https://turso.tech) (SQLite en la nube, con plan gratuito).

1. Crea una base en Turso y copia su URL (`libsql://…`) y un token.
2. En Vercel, importa el repositorio con **Root Directory** = `abanico`.
3. Variables: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SETUP_CODE` y
   `APP_URL` (tu dominio, p. ej. `https://lealtad.abanico.mx`).
4. Entra a `/panel` y crea tu cuenta con el `SETUP_CODE`.

### Variables de entorno

Ver [`.env.example`](./.env.example).

| Variable                | Para qué                                                                        |
| ----------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `file:./data/abanico.db` (local) o `libsql://…` (Turso).                         |
| `DATABASE_AUTH_TOKEN`   | Token de Turso (solo con Turso).                                                 |
| `SETUP_CODE`            | Obligatorio en producción: código para crear la primera cuenta.                  |
| `APP_URL`               | Dominio público, para los QR y los enlaces de WhatsApp.                          |
| `APP_TIMEZONE`          | Zona horaria del negocio (por defecto `America/Mexico_City`).                    |
| `SESSION_SECRET`        | Opcional. Si no se define, se genera uno y se guarda en la base.                 |
| `PRIVACY_CONTACT_EMAIL` | Opcional. Correo que aparece en el aviso de privacidad para derechos ARCO.       |

## Antes de abrirlo al público

- **Aviso de privacidad** (`/privacidad`): es una base general. Revísalo con tu
  asesor y agrega tu domicilio y correo de contacto.
- **Colores**: toda la paleta está en `src/app/globals.css` (`@theme`). Si
  Abanico tiene colores oficiales, se cambian ahí.
- **Premios de ejemplo**: los niveles y el catálogo vienen con ejemplos de una
  cafetería; ajústalos en el panel → Ajustes.

## Seguridad

- Contraseñas con scrypt; sesiones firmadas en cookie `httpOnly` que se
  invalidan al cambiar la contraseña o desactivar a la persona.
- Límite de intentos en inicio de sesión, registro y configuración inicial.
- Cada acción del servidor revisa quién la pide: el equipo registra compras y
  canjea; solo la dueña/o cambia el programa, borra clientes y exporta.
- La tarjeta del cliente se abre con un enlace secreto (no adivinable); su
  código corto sirve para validar canjes.

## Lo que todavía no incluye

- **Apple Wallet / Google Wallet**: requieren cuentas de desarrollador de
  Apple ($99 USD al año) y de Google Wallet, más certificados para firmar los
  pases. Hoy la tarjeta vive como página web que se agrega a la pantalla de
  inicio.
- **Recordatorios automáticos** (push o SMS). Por ahora el panel te muestra a
  quién escribir y abre WhatsApp con el mensaje listo.
- **Varias sucursales**.

## Desarrollo

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm start          # servir el build
npm run typecheck  # TypeScript
npm test           # pruebas de las reglas (niveles, puntos, teléfonos, códigos, fechas)
```

Estructura:

- `src/app/` — páginas: portada, registro (`/unirse`), tarjeta del cliente
  (`/tarjeta/[token]`), aviso de privacidad y el panel (`/panel/…`).
- `src/lib/loyalty.ts` — datos: clientes, sellos, puntos, premios y estadísticas.
- `src/lib/stamps.ts` — reglas puras de niveles y puntos (con pruebas en `tests/`).
- `src/lib/actions/` — acciones del servidor (públicas y del panel).
- `src/lib/db.ts` — conexión y esquema de la base de datos.
- `src/components/` — tarjeta de sellos, tarjeta de puntos, escáner de QR y formularios.
