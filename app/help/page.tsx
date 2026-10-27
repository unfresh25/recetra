import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { Logo } from "@/components/ui/logo";
import { legal } from "@/lib/legal";
import { ContactButton, Faq, type FaqGroup } from "./faq";

export const metadata: Metadata = { title: "Ayuda" };

const groups: FaqGroup[] = [
  {
    title: "Entrar",
    items: [
      {
        q: "No me llegó el código",
        a: "Puede tardar hasta un minuto. Revisa la carpeta de spam o promociones. Si no aparece, vuelve atrás y pide uno nuevo; por seguridad debes esperar unos segundos entre pedidos.",
      },
      {
        q: "¿Por qué no tengo contraseña?",
        a: "Mise usa un código de 6 dígitos que te llega al correo cada vez que entras. Así no tienes que recordar nada y nadie puede adivinar tu contraseña.",
      },
      {
        q: "El código dice que es incorrecto",
        a: "Cada código sirve una sola vez y vence en una hora. Si pediste varios, usa el último que recibiste.",
      },
    ],
  },
  {
    title: "Tu hogar",
    items: [
      {
        q: "¿Cómo invito a mi pareja?",
        a: "Ve a Perfil y toca “Invitar a mi pareja”. Comparte el enlace; vence en 7 días. Al abrirlo, tu pareja entra con su propio correo y queda en tu hogar.",
      },
      {
        q: "¿Qué ve cada miembro del hogar?",
        a: "Todos ven y editan el mismo plan, las recetas y la lista de mercado. Las alergias y gustos son de cada persona, y el plan los respeta todos.",
      },
      {
        q: "¿Puedo estar en dos hogares?",
        a: "Por ahora no: cada cuenta pertenece a un solo hogar.",
      },
    ],
  },
  {
    title: "Recetas y plan",
    items: [
      {
        q: "¿Cómo importo una receta de TikTok, Instagram o YouTube?",
        a: "En Recetas toca “Importar receta” y pega el enlace del video. En Android también puedes usar Compartir → Mise desde la app del video. Mise extrae ingredientes y pasos, y conserva el crédito del creador.",
      },
      {
        q: "No me gusta una comida del plan",
        a: "Toca la comida y elige cambiarla. Mise aprende de esos cambios y de tus reacciones para el siguiente plan.",
      },
    ],
  },
  {
    title: "Mercado y precios",
    items: [
      {
        q: "¿De dónde salen los precios?",
        a: "De las tiendas en línea de cada supermercado, actualizados cada noche. Pueden variar frente a la tienda física.",
      },
      {
        q: "¿Qué supermercados están disponibles?",
        a: "Éxito, Carulla, Olímpica, D1, Ara, MegaTiendas, Makro, Jumbo e Isimo, en Barranquilla y Puerto Colombia.",
      },
    ],
  },
  {
    title: "La app",
    items: [
      {
        q: "¿Cómo instalo Mise en mi celular?",
        a: "En iPhone, abre Mise en Safari, toca Compartir y luego “Agregar a inicio”. En Android, abre Mise en Chrome, toca el menú ⋮ y luego “Instalar app”.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Nada. Mise es gratis, no tiene publicidad y no vende tus datos.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="relative isolate flex flex-1 flex-col px-5 pt-safe pb-safe text-ink">
      <div aria-hidden className="fixed inset-0 -z-10 bg-canvas" />
      <header className="relative flex h-14 items-center justify-center">
        <BackButton fallback="/welcome" className="absolute -left-2" />
        <Logo className="h-7" />
      </header>

      <h1 className="mt-10 font-display text-[32px] leading-10 tracking-tight">¿En qué te ayudamos?</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">
        Las preguntas más comunes. Si no encuentras la tuya, escríbenos.
      </p>

      <Faq groups={groups} />

      <section className="mt-14 mb-10 flex flex-col items-start gap-4">
        <h2 className="font-display text-[24px] leading-tight tracking-tight">¿Sigues con dudas?</h2>
        <p className="text-[16px] leading-relaxed text-ink-muted">
          Te respondemos personalmente en {legal.contactEmail}, normalmente en menos de un día.
        </p>
        <ContactButton email={legal.contactEmail} />
        <p className="mt-2 text-[14px] text-ink-muted">
          <Link href="/legal/terms" className="link-text">
            Condiciones de uso
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="link-text">
            Aviso de privacidad
          </Link>
        </p>
      </section>
    </main>
  );
}
