import type { Metadata } from "next";
import "./globals.css";
import { scriptTema } from "@/components/BotaoTema";

export const metadata: Metadata = {
  title: { default: "Gestão de Contratos", template: "%s · Gestão de Contratos" },
  description: "Contratos, Licenças Sanitárias (ANVISA), Manuais de Boas Práticas e Faturamento de transportadoras",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* aplica o tema salvo (localStorage) antes da pintura */}
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
