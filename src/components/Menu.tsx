"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  BookOpenCheck,
  FileSpreadsheet,
  FileWarning,
  FileSignature,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  ReceiptText,
  ShieldPlus,
  Truck,
  Users,
  X,
} from "lucide-react";
import { sair } from "@/actions/auth";
import { BotaoTema } from "./BotaoTema";
import { MarcaLK } from "./Logo";

type Item = { href: string; rotulo: string; rotuloCliente?: string; icone: typeof Truck; admin?: boolean };

const grupos: { titulo: string; itens: Item[] }[] = [
  { titulo: "", itens: [{ href: "/", rotulo: "Dashboard", icone: LayoutDashboard }] },
  {
    titulo: "Documentos",
    itens: [
      { href: "/contratos", rotulo: "Contratos", icone: FileSignature },
      { href: "/licencas", rotulo: "Licenças e Documentos", icone: ShieldPlus },
      { href: "/manuais", rotulo: "Manuais & POPs", icone: BookOpenCheck },
    ],
  },
  { titulo: "Financeiro", itens: [{ href: "/faturamento", rotulo: "Serviços & Faturamento", rotuloCliente: "Cobranças em aberto", icone: ReceiptText }] },
  { titulo: "Gestão", itens: [{ href: "/relatorios", rotulo: "Relatórios", icone: FileSpreadsheet }] },
  {
    titulo: "Administração",
    itens: [
      { href: "/transportadoras", rotulo: "Transportadoras", icone: Truck, admin: true },
      { href: "/usuarios", rotulo: "Usuários & Acessos", icone: Users, admin: true },
      { href: "/auditoria", rotulo: "Trilha de Auditoria", icone: History, admin: true },
    ],
  },
  { titulo: "Conta", itens: [{ href: "/conta", rotulo: "Minha Senha", icone: KeyRound }] },
];

type UsuarioMenu = { nome: string; email: string; perfil: "ADMIN" | "CLIENT"; carrier: { nome: string; cnpj: string } | null };

function Marca() {
  return (
    <MarcaLK
      complemento={
        <>
          <span className="block font-marca text-[12px] font-semibold text-t1">Gestão de Contratos</span>
          <span className="block font-marca text-[10px] font-medium uppercase tracking-[0.18em] text-t3">Compliance</span>
        </>
      }
    />
  );
}

/** Menu lateral + barra superior (com o botão de tema). */
export function Menu({
  usuario,
  cnpjFormatado,
  emissao,
}: {
  usuario: UsuarioMenu;
  cnpjFormatado: string | null;
  /** ADM: NFs pendentes de emissão (notificador do cabeçalho). */
  emissao?: { total: number; atrasadas: number } | null;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const admin = usuario.perfil === "ADMIN";

  return (
    <>
      {/* barra superior */}
      <header className="sticky top-0 z-30 bg-fundo/90 backdrop-blur-sm lg:pl-[268px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-[14px] py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="btn-icone lg:hidden" onClick={() => setAberto(!aberto)} aria-label={aberto ? "Fechar menu" : "Abrir menu"}>
              {aberto ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-t1">{admin ? "Consultoria L&K" : usuario.carrier?.nome}</p>
              <p className="truncate text-[11px] text-t3">{admin ? "Perfil Administrador · acesso total" : `CNPJ ${cnpjFormatado} · somente visualização e download`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[12px] font-semibold text-t1">{usuario.nome}</p>
              <p className="text-[11px] text-t3">{usuario.email}</p>
            </div>
            {emissao && emissao.total > 0 && (
              <Link
                href="/faturamento?status=PENDING_EMISSION"
                className={clsx("btn-icone relative w-auto gap-1.5 px-3 text-[12px] font-semibold", emissao.atrasadas ? "!text-erro" : "!text-ouro")}
                title={`${emissao.total} NF(s) pendente(s) de emissão${emissao.atrasadas ? ` — ${emissao.atrasadas} atrasada(s)` : ""}`}
                aria-label={`${emissao.total} notas fiscais pendentes de emissão`}
              >
                <FileWarning className="h-5 w-5" />
                <span className="num">{emissao.total}</span>
                {emissao.atrasadas > 0 && <span className="ponto ponto-pulsante absolute right-1.5 top-1.5 text-erro" style={{ animationName: "pulso-erro" }} />}
              </Link>
            )}
            <BotaoTema />
            <form action={sair}>
              <button className="btn-icone" aria-label="Sair" title="Sair">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* menu lateral */}
      <aside className={clsx("fixed inset-y-0 left-0 z-40 w-[268px] p-3 transition-transform duration-[250ms] lg:translate-x-0", aberto ? "translate-x-0" : "-translate-x-full")}>
        <div className="card flex h-full flex-col overflow-hidden">
          <div className="px-5 pb-4 pt-5">
            <Marca />
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
            {grupos.map((g) => {
              const itens = g.itens.filter((i) => !i.admin || admin);
              if (!itens.length) return null;
              return (
                <div key={g.titulo}>
                  {g.titulo && <p className="secao px-3 pb-1.5">{g.titulo}</p>}
                  <div className="space-y-1">
                    {itens.map((i) => (
                      <Link
                        key={i.href}
                        href={i.href}
                        onClick={() => setAberto(false)}
                        aria-current={ativo(i.href) ? "page" : undefined}
                        className={clsx(
                          "flex min-h-[44px] items-center gap-3 rounded-full px-4 text-[12px] font-medium transition-[background,color,box-shadow] duration-200",
                          ativo(i.href) ? "fill-acento font-semibold" : "text-t2 hover:bg-acento/[.09] hover:text-acento",
                        )}
                      >
                        <i.icone className="h-4 w-4 flex-none" />
                        {admin ? i.rotulo : (i.rotuloCliente ?? i.rotulo)}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="p-3">
            <div className="poco p-4">
              <p className="truncate text-[12px] font-semibold text-t1">{usuario.nome}</p>
              <p className="truncate text-[11px] text-t3">{admin ? "ADM Geral (Consultoria)" : "Cliente / Transportador"}</p>
            </div>
          </div>
        </div>
      </aside>

      {aberto && <div className="fixed inset-0 z-30 bg-[#000814]/60 lg:hidden" onClick={() => setAberto(false)} />}
    </>
  );
}
