"use client";

import { useRef } from "react";

/**
 * Formulário GET de filtros: selects e datas aplicam o filtro na hora;
 * campos de texto aplicam com Enter.
 */
export function FormFiltro({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      method="get"
      className={className ?? "mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"}
      onChange={(e) => {
        const alvo = e.target as HTMLElement;
        if (alvo.tagName === "SELECT" || (alvo as HTMLInputElement).type === "month" || (alvo as HTMLInputElement).type === "checkbox") {
          ref.current?.requestSubmit();
        }
      }}
    >
      {children}
    </form>
  );
}
