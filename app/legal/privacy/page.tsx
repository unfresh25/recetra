import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";
import { LegalSection } from "../legal-section";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function PrivacyPage() {
  const email = <a className="link-text" href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>;

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1>Aviso de privacidad</h1>
        <p className="text-[15px] text-ink-muted">Última actualización: {legal.updatedAt}</p>
        <p>
          Este aviso explica qué datos personales recoge Mise, para qué los usa, con quién los comparte y cómo puedes
          ejercer tus derechos, de acuerdo con la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia. Complementa
          las <Link className="link-text" href="/legal/terms">Condiciones de uso</Link>.
        </p>
      </header>

      <LegalSection title="1. Responsable" summary="quién cuida tus datos y cómo contactarlo.">
        <p>
          {legal.owner}, con domicilio en {legal.city}, es el responsable del tratamiento de tus datos. Para cualquier
          asunto de privacidad escribe a {email}.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos recogemos" summary="solo lo necesario para planear las comidas de tu hogar.">
        <ul>
          <li>
            <strong>Cuenta:</strong> tu correo, tu nombre, cómo quieres que te llamemos y una foto, si decides subirla.
          </li>
          <li>
            <strong>Hogar:</strong> los miembros, cuántas personas comen, el presupuesto y los supermercados que usas.
          </li>
          <li>
            <strong>Preferencias:</strong> sistema de medidas, estilos de cocina, electrodomésticos, ingredientes que no
            te gustan, dietas y alergias.
          </li>
          <li>
            <strong>Uso:</strong> recetas importadas, plan semanal, lista de mercado, favoritos, reacciones y comidas que
            registras con sus calorías.
          </li>
          <li>
            <strong>Ubicación:</strong> solo si la permites, para mostrar sucursales cercanas. Se guarda en tu
            dispositivo, no en nuestros servidores.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Datos sensibles" summary="tus alergias y dietas son opcionales y solo filtran recetas.">
        <p>
          Las alergias y dietas pueden revelar información de salud, que la ley considera sensible.{" "}
          <strong>No estás obligado a darlas.</strong> Si las das, las usamos únicamente para ocultar recetas que no
          puedes o no quieres comer, y nunca las enviamos a proveedores de inteligencia artificial.
        </p>
      </LegalSection>

      <LegalSection title="4. Para qué los usamos" summary="para que la app funcione, nada más.">
        <ul>
          <li>Crear tu cuenta, iniciar sesión y conectar tu hogar.</li>
          <li>Armar el plan de comidas, la lista de mercado y la comparación de precios.</li>
          <li>Ocultar recetas con tus alergias y aprender de los gustos del hogar.</li>
          <li>Importar recetas y estimar calorías.</li>
          <li>Responder tus solicitudes y avisarte de cambios importantes.</li>
        </ul>
        <p>
          <strong>No vendemos tus datos, no mostramos publicidad y no los usamos para entrenar modelos de inteligencia
          artificial.</strong>
        </p>
      </LegalSection>

      <LegalSection title="5. Con quién los compartimos" summary="con los proveedores que hacen funcionar la app y con tu hogar.">
        <p>Mise usa estos proveedores, que procesan datos por encargo nuestro y solo para prestar el servicio:</p>
        <ul>
          <li>
            <strong>Supabase:</strong> base de datos, inicio de sesión y almacenamiento de archivos.
          </li>
          <li>
            <strong>Vercel:</strong> alojamiento de la app.
          </li>
          <li>
            <strong>Anthropic y Groq:</strong> procesan el texto, el audio y las imágenes de las recetas que importas.
            No les enviamos tu correo, tu nombre ni tus alergias.
          </li>
        </ul>
        <p>
          Los miembros de tu hogar ven el plan, las recetas, la lista de mercado y las preferencias del hogar. No
          compartimos tus datos con nadie más, salvo que una autoridad competente lo exija.
        </p>
      </LegalSection>

      <LegalSection title="6. Transferencia internacional" summary="nuestros proveedores están principalmente en Estados Unidos.">
        <p>
          Los proveedores anteriores almacenan o procesan datos fuera de Colombia, principalmente en Estados Unidos. Al
          aceptar este aviso autorizas esa transferencia, que se hace con proveedores que ofrecen medidas de seguridad
          adecuadas.
        </p>
      </LegalSection>

      <LegalSection title="7. Cuánto tiempo los guardamos" summary="mientras tengas cuenta; al borrarla, en 30 días desaparecen.">
        <p>
          Guardamos tus datos mientras tengas una cuenta. Si pides borrarla, los eliminamos de los sistemas activos en
          máximo 30 días y de las copias de seguridad en máximo 90 días, salvo lo que la ley nos obligue a conservar.
        </p>
      </LegalSection>

      <LegalSection title="8. Tus derechos" summary="puedes conocer, corregir, borrar y retirar tu autorización.">
        <p>Como titular de tus datos puedes:</p>
        <ul>
          <li>Conocer, actualizar y corregir tus datos.</li>
          <li>Pedir prueba de la autorización que nos diste.</li>
          <li>Saber cómo hemos usado tus datos.</li>
          <li>Revocar la autorización o pedir que borremos tus datos.</li>
          <li>Pedir una copia de tus datos en formato JSON o CSV.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
        </ul>
        <p>
          Escríbenos a {email} desde el correo de tu cuenta. Respondemos consultas en máximo 10 días hábiles y reclamos
          en máximo 15 días hábiles.
        </p>
      </LegalSection>

      <LegalSection title="9. Seguridad" summary="tus datos viajan cifrados y cada hogar solo ve lo suyo.">
        <p>
          La información viaja cifrada y la base de datos aplica reglas para que cada hogar solo pueda leer su propia
          información. Ningún sistema es infalible: si detectamos un incidente que afecte tus datos, te avisaremos y lo
          reportaremos a la autoridad cuando corresponda.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies y almacenamiento local" summary="solo lo necesario para mantener tu sesión.">
        <p>
          Usamos cookies técnicas para mantener tu sesión iniciada. Tu dispositivo guarda además algunos datos para que
          la app funcione sin conexión, como la ubicación que compartiste y los productos que marcas en la lista de mercado.
          No usamos cookies de publicidad ni de rastreo.
        </p>
      </LegalSection>

      <LegalSection title="11. Menores de edad" summary="Mise no está pensada para menores sin supervisión.">
        <p>
          Mise está dirigida a personas mayores de 18 años. Si un menor la usa, debe hacerlo con autorización de sus
          padres o acudientes, quienes pueden ejercer los derechos de este aviso en su nombre.
        </p>
      </LegalSection>

      <LegalSection title="12. Cambios a este aviso" summary="te avisamos con 30 días antes de cualquier cambio importante.">
        <p>
          Si cambiamos este aviso de forma importante, te lo informaremos en la app o por correo con al menos 30 días
          de anticipación.
        </p>
      </LegalSection>
    </>
  );
}
