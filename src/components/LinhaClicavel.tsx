"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";

/** Linha de tabela que navega ao ser clicada (ignora cliques em botões/links internos). */
export function LinhaClicavel({ href, children, className, titulo }: { href?: string; children: React.ReactNode; className?: string; titulo?: string }) {
  const router = useRouter();
  if (!href) return <tr className={className}>{children}</tr>;
  return (
    <tr
      className={clsx("linha-clicavel", className)}
      title={titulo}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,form,input,select")) return;
        router.push(href, { scroll: false });
      }}
    >
      {children}
    </tr>
  );
}
