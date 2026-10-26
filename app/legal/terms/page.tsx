import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";
import { LegalSection } from "../legal-section";

export const metadata: Metadata = { title: "Condiciones de uso" };

export default function TermsPage() {
  const email = <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>;

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1>Condiciones de uso</h1>
        <p className="text-[15px] text-ink-muted">Última actualización: {legal.updatedAt}</p>
        <p>
          Estas condiciones regulan el uso de Mise, la app web para planear las comidas de tu hogar. En este documento,
          “Mise”, “nosotros” y “nuestro” se refieren a {legal.owner}, responsable del servicio, con domicilio en{" "}
          {legal.city}. “Tú” eres la persona que usa la app. Cada sección empieza con un resumen en una línea.
        </p>
      </header>

      <LegalSection title="1. Aceptación" summary="al crear tu cuenta aceptas estas condiciones.">
        <p>
          Cuando inicias sesión por primera vez aceptas estas condiciones y el{" "}
          <Link href="/legal/privacy">Aviso de privacidad</Link>. Si no estás de acuerdo, no uses Mise.
        </p>
        <p>
          Debes ser mayor de 18 años o usar Mise con autorización de tus padres o acudientes. Cada persona que se une a
          un hogar acepta estas condiciones por sí misma.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué es Mise" summary="te ayudamos a planear, comprar y cocinar; no somos médicos ni una tienda.">
        <p>
          Mise arma el plan de comidas de la semana con recetas reales, genera la lista de mercado, compara precios entre
          supermercados, muestra sucursales cercanas y estima las calorías de lo que comes. Mise no vende productos ni
          procesa compras: el mercado lo haces tú, en la tienda que elijas.
        </p>
        <ul>
          <li>
            Los <strong>precios</strong> provienen de las tiendas en línea de cada supermercado. Pueden cambiar o no
            coincidir con la tienda física; el precio que pagas es el que te cobre el supermercado.
          </li>
          <li>
            Las <strong>calorías e información nutricional</strong> son estimaciones, algunas hechas con inteligencia
            artificial. No son una valoración médica ni nutricional.
          </li>
          <li>
            Mise <strong>oculta las recetas con los alérgenos que marques</strong>, pero no conoce la composición exacta
            de cada producto que compras. Si tienes una alergia grave, revisa siempre las etiquetas y consulta a un
            profesional de la salud.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Tu cuenta y tu hogar" summary="tu cuenta es personal; el hogar se comparte con quien invites.">
        <ul>
          <li>Entras con tu correo y un código de un solo uso. Mantén seguro el acceso a ese correo.</li>
          <li>Cada cuenta es de una sola persona. No compartas tu sesión.</li>
          <li>
            Los miembros de un hogar ven y editan el mismo plan, las recetas, la lista de mercado y las preferencias
            del hogar.
          </li>
          <li>
            Quien tenga un enlace de invitación vigente puede unirse a tu hogar. Compártelo solo con personas de
            confianza.
          </li>
          <li>Avísanos a {email} si crees que alguien entró a tu cuenta sin permiso.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso aceptable" summary="usa Mise para planear tu alimentación, no para otra cosa.">
        <p>No está permitido:</p>
        <ul>
          <li>Intentar acceder a hogares, cuentas o datos que no son tuyos.</li>
          <li>Extraer datos de Mise de forma automatizada, incluidos los precios.</li>
          <li>Copiar, descompilar o intentar obtener el código fuente de la app.</li>
          <li>Sobrecargar el servicio o interferir con su funcionamiento.</li>
          <li>Usar las recetas importadas para redistribuir o publicar contenido de otros creadores.</li>
          <li>Subir contenido ilegal, ofensivo o que infrinja derechos de terceros.</li>
        </ul>
        <p>Si incumples estas reglas podemos suspender o cerrar tu cuenta.</p>
      </LegalSection>

      <LegalSection title="5. Tu contenido" summary="lo que guardas sigue siendo tuyo; solo lo usamos para que la app funcione.">
        <p>
          Puedes importar recetas, escribir notas, registrar comidas y subir fotos. Conservas los derechos que tengas
          sobre ese contenido. Nos das un permiso limitado, no exclusivo y gratuito para guardarlo, procesarlo y
          mostrarlo a los miembros de tu hogar, solo para prestarte el servicio.
        </p>
        <p>
          Cuando importas una receta desde TikTok, Instagram, YouTube u otro sitio, Mise guarda el enlace, el crédito del
          creador y un resumen de ingredientes y pasos para tu uso personal. El contenido original sigue siendo de su
          autor.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus datos son tuyos" summary="puedes pedir una copia o el borrado cuando quieras.">
        <p>
          No reclamamos ningún derecho sobre tus datos. Puedes pedirnos una copia en formato JSON o CSV escribiendo a{" "}
          {email}, y te la enviaremos en máximo 15 días hábiles.
        </p>
        <p>
          <strong>No vendemos tus datos, no mostramos publicidad y no usamos tu información para entrenar modelos de
          inteligencia artificial.</strong>{" "}
          El detalle de cómo la tratamos está en el <Link href="/legal/privacy">Aviso de privacidad</Link>.
        </p>
      </LegalSection>

      <LegalSection title="7. Propiedad intelectual" summary="la app es nuestra; las recetas y marcas son de sus dueños.">
        <p>
          El nombre Mise, su logo, su diseño y su código nos pertenecen. Te damos una licencia personal, gratuita,
          revocable e intransferible para usar la app mientras cumplas estas condiciones.
        </p>
        <p>
          Los nombres y logos de los supermercados, y las recetas y videos de los creadores, pertenecen a sus
          respectivos dueños. Mise los muestra solo para identificarlos y darles crédito.
        </p>
      </LegalSection>

      <LegalSection title="8. Precio" summary="Mise es gratis y no te cobraremos nada sin que lo aceptes.">
        <p>
          Mise es gratuita. No pedimos medios de pago ni hay suscripciones. Si algún día ofrecemos funciones pagas, lo
          anunciaremos con al menos 30 días de anticipación y <strong>nunca te cobraremos sin tu aceptación expresa</strong>
          . Las funciones que hoy son gratis seguirán disponibles durante ese aviso.
        </p>
      </LegalSection>

      <LegalSection title="9. Disponibilidad" summary="hacemos lo posible para que funcione siempre, pero no lo garantizamos.">
        <p>
          Mise es un proyecto independiente y se ofrece tal como está. No garantizamos un tiempo de disponibilidad
          determinado. Puede haber mantenimientos, errores o interrupciones, y los sitios de los supermercados pueden
          cambiar sin aviso y afectar los precios. Tampoco respondemos por fallas causadas por fuerza mayor o por los
          servicios de terceros de los que depende la app.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitación de responsabilidad" summary="no respondemos por daños indirectos, salvo lo que la ley no permita excluir.">
        <p>
          <strong>
            En la medida que lo permita la ley colombiana, no respondemos por daños indirectos o consecuenciales, como
            diferencias de precio en la tienda, compras que hayas hecho con base en la app o reacciones a productos cuya
            composición no corresponda a lo que muestra Mise.
          </strong>
        </p>
        <p>
          Esta limitación no aplica a los daños causados por dolo o culpa grave, ni afecta los derechos que te
          reconoce el Estatuto del Consumidor (Ley 1480 de 2011).
        </p>
      </LegalSection>

      <LegalSection title="11. Indemnidad" summary="si usas mal la app y eso genera un reclamo, respondes tú.">
        <p>
          Si un tercero nos reclama por contenido que tú subiste o por un uso de Mise contrario a estas condiciones,
          responderás por los daños y gastos razonables que ese reclamo nos cause.
        </p>
      </LegalSection>

      <LegalSection title="12. Terminación" summary="puedes irte cuando quieras; borramos tus datos en 30 días.">
        <p>
          Puedes dejar de usar Mise en cualquier momento y pedir que borremos tu cuenta escribiendo a {email}. Eliminamos
          tus datos personales de los sistemas activos en máximo 30 días y de las copias de seguridad en máximo 90
          días. El contenido compartido con tu hogar seguirá disponible para los demás miembros.
        </p>
        <p>
          Podemos suspender o cerrar tu cuenta si incumples estas condiciones. Salvo urgencia, te avisaremos antes por
          correo. Las secciones 5, 7, 10, 11 y 13 siguen vigentes después de la terminación.
        </p>
      </LegalSection>

      <LegalSection title="13. Ley aplicable y disputas" summary="aplica la ley colombiana y tus derechos como consumidor se mantienen.">
        <p>
          Estas condiciones se rigen por las leyes de la República de Colombia. Antes de cualquier reclamo, escríbenos a{" "}
          {email} para buscar una solución directa. Si no llegamos a un acuerdo, serán competentes los jueces de{" "}
          {legal.city}, sin perjuicio de tu derecho a acudir a la Superintendencia de Industria y Comercio.
        </p>
      </LegalSection>

      <LegalSection title="14. Cambios a estas condiciones" summary="te avisamos con 30 días antes de cualquier cambio importante.">
        <p>
          Si hacemos un cambio importante, te lo avisaremos en la app o por correo con al menos 30 días de
          anticipación. Si no estás de acuerdo, puedes cerrar tu cuenta antes de que entre en vigor. Si sigues usando
          Mise después de esa fecha, aceptas la nueva versión.
        </p>
      </LegalSection>

      <LegalSection title="15. Disposiciones generales" summary="lo de siempre, para que el acuerdo funcione.">
        <ul>
          <li>Si una cláusula resulta inválida, las demás siguen vigentes.</li>
          <li>
            Estas condiciones y el Aviso de privacidad son el acuerdo completo entre tú y Mise sobre el uso de la app.
          </li>
          <li>No puedes ceder tu cuenta a otra persona. Nosotros podemos ceder el servicio si avisamos antes.</li>
          <li>No ejercer un derecho en un momento dado no significa renunciar a él.</li>
          <li>Te enviaremos los avisos al correo de tu cuenta. Tú puedes escribirnos a {email}.</li>
        </ul>
      </LegalSection>
    </>
  );
}
