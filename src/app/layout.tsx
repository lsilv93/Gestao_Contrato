import type { Metadata } from "next";
import "./globals.css";
import { scriptTema } from "@/components/BotaoTema";

export const metadata: Metadata = {
  title: { default: "L&K Assessoria Farmacêutica", template: "%s · L&K Assessoria Farmacêutica" },
  description: "L&K Assessoria Farmacêutica — Gestão de Contratos e Compliance: contratos, licenças sanitárias ANVISA, manuais de boas práticas e faturamento de transportadoras",
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
