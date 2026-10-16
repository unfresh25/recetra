import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ui/screen-header";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col gap-8">
      <ScreenHeader
        backHref="/welcome"
        title="Entra a Recetra"
        subtitle="Te enviamos un código de 6 dígitos a tu correo. Sin contraseñas."
      />
      <div className="flex flex-1 flex-col px-5">
        <LoginForm />
      </div>
    </main>
  );
}
