"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Tema = "dark" | "light";
export const CHAVE_TEMA = "gc_tema";

/**
 * Script executado no <head> antes da pintura: aplica o tema salvo no
 * localStorage (ou o do sistema operacional) sem "piscar".
 */
export const scriptTema = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}})();`;

/** Alterna Light / Dark; a escolha fica salva no localStorage. */
export function BotaoTema() {
  const [tema, setTema] = useState<Tema>("dark");

  useEffect(() => {
    const atual = document.documentElement.dataset.theme;
    if (atual === "light" || atual === "dark") setTema(atual);
  }, []);

  function alternar() {
    const novo: Tema = tema === "dark" ? "light" : "dark";
    setTema(novo);
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem(CHAVE_TEMA, novo);
    } catch {
      /* navegação privada: vale só para esta aba */
    }
  }

  const rotulo = tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro";
  const Icone = tema === "dark" ? Sun : Moon;
  return (
    <button type="button" onClick={alternar} className="btn-icone" aria-label={rotulo} title={rotulo}>
      <Icone className="h-5 w-5" />
    </button>
  );
}
