import type { Metadata } from "next";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

// Sans de texto com desenho proprio (nao Inter, nao Roboto, nao system-ui)
// e uma mono para TODO numero. Ambas self-hosted pelo next/font.
const fonteTexto = Public_Sans({
  subsets: ["latin"],
  variable: "--fonte-texto",
  display: "swap",
});

const fonteNumero = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--fonte-numero",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRM Suporte + Dev",
  description: "Atendimento do suporte e board de desenvolvimento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteTexto.variable} ${fonteNumero.variable}`}>
      <body>{children}</body>
    </html>
  );
}
