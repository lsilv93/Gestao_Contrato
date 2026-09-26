"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra de progresso no topo durante a navegação. As páginas são geradas no
 * servidor a cada acesso; sem este retorno visual o clique parecia não ter
 * efeito ("travado") até a página nova chegar.
 */
export function ProgressoNavegacao() {
  const pathname = usePathname();
  const busca = useSearchParams();
  const [estado, setEstado] = useState<"parado" | "carregando" | "fim">("parado");
  const limite = useRef<ReturnType<typeof setTimeout>>(undefined);

  // página nova chegou (URL mudou): completa e esconde
  useEffect(() => {
    setEstado((e) => (e === "carregando" ? "fim" : e));
    clearTimeout(limite.current);
  }, [pathname, busca]);

  useEffect(() => {
    if (estado !== "fim") return;
    const t = setTimeout(() => setEstado("parado"), 350);
    return () => clearTimeout(t);
  }, [estado]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // mesma página (ou só #âncora)
      setEstado("carregando");
      clearTimeout(limite.current);
      limite.current = setTimeout(() => setEstado("parado"), 20_000); // nunca fica presa
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  if (estado === "parado") return null;
  return <div className={`progresso-nav ${estado === "fim" ? "progresso-fim" : ""}`} role="progressbar" aria-label="Carregando página" />;
}
