import Link from "next/link";

export const metadata = { title: "Aviso de privacidad — Consultorio" };

/**
 * PLANTILLA de aviso de privacidad. Antes de abrir la plataforma a otras
 * personas, quien la opera debe completar los datos entre corchetes y
 * revisarla con asesoría legal.
 */
export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-10">
      <article className="mx-auto max-w-2xl text-sm leading-relaxed text-dark/80">
        <Link href="/" className="text-sm text-blue-accent">
          ← Volver
        </Link>
        <h1 className="mt-4 font-serif text-3xl text-dark">Aviso de privacidad</h1>
        <p className="mt-2 rounded border border-orange-accent/30 bg-orange-accent/[0.06] px-3 py-2 text-dark">
          Plantilla: los datos entre corchetes deben completarse y el texto revisarse con asesoría legal antes de
          invitar a otras personas a usar la plataforma.
        </p>

        <h2 className="mt-8 font-serif text-xl text-dark">Quién es responsable de tus datos</h2>
        <p className="mt-2">
          [Nombre o razón social del responsable], con domicilio en [domicilio], es responsable del tratamiento de
          los datos personales de las personas que crean una cuenta en esta plataforma. Contacto para temas de
          privacidad: [correo de contacto].
        </p>

        <h2 className="mt-8 font-serif text-xl text-dark">Qué datos tratamos</h2>
        <p className="mt-2">
          De ti, como usuaria o usuario: nombre, especialidad, correo electrónico y contraseña (que se guarda
          transformada de forma irreversible, nunca en claro).
        </p>
        <p className="mt-2">
          Además, guardas en tu cuenta información de tus pacientes: nombres, datos de contacto, fechas de sesión,
          montos, pagos y notas administrativas. Esa información puede considerarse sensible porque revela que una
          persona asiste a terapia. Respecto de esos datos, tú eres responsable frente a tus pacientes y la
          plataforma solo los resguarda por cuenta tuya; no los usa para ningún otro fin.
        </p>

        <h2 className="mt-8 font-serif text-xl text-dark">Para qué los usamos</h2>
        <ul className="mt-2 list-disc pl-5">
          <li>Crear y mantener tu cuenta e identificarte al iniciar sesión.</li>
          <li>Guardar la información de tu consulta para que la veas desde cualquier dispositivo.</li>
          <li>Calcular tus totales, reportes y avisos de revisión.</li>
        </ul>
        <p className="mt-2">No vendemos ni compartimos tus datos con terceros para publicidad.</p>

        <h2 className="mt-8 font-serif text-xl text-dark">Cómo los protegemos</h2>
        <ul className="mt-2 list-disc pl-5">
          <li>La información de tu consulta se guarda cifrada (AES-256) y solo tu cuenta puede leerla.</li>
          <li>La conexión con la plataforma va cifrada (https).</li>
          <li>Las sesiones se cierran solas tras 30 días y la cuenta se bloquea temporalmente tras varios intentos fallidos de contraseña.</li>
          <li>Usamos únicamente una cookie técnica para mantener tu sesión iniciada; no usamos cookies de publicidad.</li>
        </ul>

        <h2 className="mt-8 font-serif text-xl text-dark">Con quién se comparten</h2>
        <p className="mt-2">
          Los datos se alojan en [proveedor de alojamiento y base de datos, p. ej. Vercel y Neon], que actúan como
          encargados del tratamiento. [Indicar si los servidores están fuera de México.] No se realizan otras
          transferencias.
        </p>

        <h2 className="mt-8 font-serif text-xl text-dark">Tus derechos</h2>
        <p className="mt-2">
          Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su tratamiento (derechos ARCO),
          así como revocar tu consentimiento. Desde Ajustes puedes descargar toda tu información y eliminar tu
          cuenta con todos sus datos en cualquier momento. Para cualquier otra solicitud escribe a [correo de
          contacto]; responderemos en un plazo de [plazo].
        </p>

        <h2 className="mt-8 font-serif text-xl text-dark">Cambios a este aviso</h2>
        <p className="mt-2">
          Cualquier cambio se publicará en esta misma página. Última actualización: [fecha].
        </p>
      </article>
    </div>
  );
}
