import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Club Beasts | Alto Rendimiento",
  description: "Software web para gimnasio de alto rendimiento - Club Beasts David Rozo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-near-black text-white min-h-screen font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
