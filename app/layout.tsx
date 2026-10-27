import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Mise's display face (Sensatype). Single weight: titles, buttons and labels.
const display = localFont({
  src: "./fonts/Working.otf",
  variable: "--font-working",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mise", template: "%s · Mise" },
  description: "Tu plan de comidas de la semana, con recetas reales y los mejores precios.",
  applicationName: "Mise",
  appleWebApp: { capable: true, title: "Mise", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#faf9f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">{children}</div>
      </body>
    </html>
  );
}
