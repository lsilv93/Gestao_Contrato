"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";

/** Campos do login com ícones e mostrar/ocultar senha. */
export function CamposLogin() {
  const [ver, setVer] = useState(false);
  return (
    <>
      <div>
        <label className="label" htmlFor="email">Usuário ou e-mail</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-t4" aria-hidden />
          <input id="email" name="email" className="input !pl-11" placeholder="seu.usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-t4" aria-hidden />
          <input id="senha" name="senha" type={ver ? "text" : "password"} className="input !pl-11 !pr-12" placeholder="••••••••" autoComplete="current-password" required />
          <button
            type="button"
            onClick={() => setVer(!ver)}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-t3 transition-colors hover:text-acento"
            aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
            title={ver ? "Ocultar senha" : "Mostrar senha"}
          >
            {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
