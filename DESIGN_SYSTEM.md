# Sistema visual

Identidad visual coherente, editorial, minimalista, cálida y profesional
para toda la aplicación.

> Este documento es referencia interna para quien desarrolla el proyecto.
> La aplicación misma no tiene ninguna pantalla de "identidad visual",
> "diseño" o "paleta" — solo usa estos colores, nunca los expone como
> contenido.

## Fuente única de verdad

Todos los colores están definidos una sola vez en
[`src/lib/theme-colors.ts`](./src/lib/theme-colors.ts). `tailwind.config.ts`
consume ese archivo y **reemplaza por completo** la paleta por defecto de
Tailwind (grises, azules, rojos, verdes, etc.), de modo que clases como
`bg-gray-100` o `text-red-500` ni siquiera existen en el proyecto.

Para cambiar cualquier color de la app entera, se edita únicamente
`theme-colors.ts`.

`npm run check:colors` recorre el repositorio y falla si encuentra un
hex/`rgb()`/`hsl()` literal fuera de ese archivo — así ninguna pantalla nueva
puede colar un color fuera de la paleta.

## Paleta

| Token             | Hex       | Uso                                                              |
| ----------------- | --------- | ----------------------------------------------------------------- |
| `dark`             | `#4C443C` | Texto, navegación, encabezados, contraste                        |
| `background`       | `#EFEDE7` | Fondo y superficies claras (predominante)                        |
| `blue-secondary`   | `#6698B7` | Elementos informativos                                           |
| `blue-accent`      | `#7096FF` | Botones primarios, interacción, indicadores, gráficas            |
| `orange-accent`    | `#D17B0F` | Atención / diferenciación — **nunca** error                      |
| `debt-red`         | `#E0000F` | **Exclusivo**: adeudos, saldos pendientes, alertas de cobro       |

Las clases de Tailwind soportan opacidad (`bg-dark/10`, `text-debt-red/70`,
etc.) para jerarquía visual sin salir de la paleta.

## Reglas que aplica el código

- **Rojo = adeudo, nada más.** `debt-red` solo aparece en: saldo pendiente de
  un paciente (`Pacientes`), sesiones sin pagar (`Sesiones`), la columna
  "Pendiente" de `Cobros`, y el KPI de pendiente en el `Panel` (solo si es
  mayor a $0). No se usa como color de error genérico ni decorativo.
- **Un saldo liquidado no queda en rojo.** Cuando el pendiente de un
  paciente/sesión es `0`, la interfaz muestra un badge neutro ("Al
  corriente"/"Pagada") en vez de una marca roja — ver `SessionStatusBadge`
  y la tabla de `Pacientes`.
- **Tablas financieras distinguibles de inmediato.** `Cobros` y la tabla de
  `Pacientes` separan Generado / Cobrado / Pendiente / Total (completo) en
  columnas con tratamiento visual distinto (texto neutro, azul de acento,
  rojo condicional, y una fila/columna de total destacada).
- **Naranja para "atención", nunca para error genérico.** Los mensajes de
  validación de formulario y la advertencia de "posible pago duplicado"
  usan `orange-accent`, no `debt-red` — no son adeudos.
- **Gráficas dentro de la paleta.** `RevenueChart` importa los colores desde
  `theme-colors.ts`, nunca declara hex propios.
- **Tipografía editorial.** Encabezados en serif (Lora), cuerpo en sans
  (Source Sans 3), con espaciado generoso y sin sombras ni bordes
  redondeados exagerados.

## Componentes base

`src/components/ui`: `Button`, `Badge`, `Card`, `Table`, `Alert`, `StatCard`,
`EmptyState`, `Modal`, `Input`, `Select`, `Textarea`, `Checkbox`,
`FormField`, `SessionStatusBadge`, `PatientStatusBadge`. Todos consumen los
tokens de color vía clases de Tailwind — ningún componente declara un color
propio.
