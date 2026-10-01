"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { SimboloLK } from "./Logo";
import type { Estado } from "@/actions/estado";

type Acao = (estado: Estado, form: FormData) => Promise<Estado>;

export function BotaoEnviar({
  children,
  enviando,
  className = "btn-primary",
  textoEnviando = "Salvando...",
}: {
  children: React.ReactNode;
  enviando: boolean;
  className?: string;
  textoEnviando?: string;
}) {
  return (
    <button type="submit" className={className} disabled={enviando} aria-busy={enviando}>
      {enviando ? (
        <>
          {/* carregamento: monograma L&K em movimento, na cor da tinta do botão */}
          <SimboloLK mono className="cam-anda h-4 w-4 flex-none" />
          {textoEnviando}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Limite por arquivo (igual ao do servidor) e por envio (a Vercel recusa requisições acima de 4,5 MB). */
export const MAX_ARQUIVO = 4 * 1024 * 1024;
export const MAX_ENVIO = 4.4 * 1024 * 1024;
const MB = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

const falhaLocal = (mensagem: string): Estado => ({ ok: false, mensagem, ts: Date.now() });

/** redirect() da server action não é erro: o roteador precisa recebê-lo. */
const ehRedirecionamento = (e: unknown) =>
  typeof e === "object" && e !== null && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");

/** Arquivos grandes demais são barrados ANTES do envio (antes travavam a tela com erro 413). */
export function validarArquivos(dados: FormData): string | null {
  const arquivos = [...dados.values()].filter((v): v is File => v instanceof File && v.size > 0);
  const grande = arquivos.find((f) => f.size > MAX_ARQUIVO);
  if (grande) return `O arquivo "${grande.name}" tem ${MB(grande.size)}. O limite é 4 MB por arquivo — compacte o PDF e tente novamente.`;
  const total = arquivos.reduce((a, f) => a + f.size, 0);
  if (total > MAX_ENVIO) return `Os arquivos somam ${MB(total)}; o limite por envio é 4,4 MB.`;
  return null;
}

/**
 * Executa a server action a partir do onSubmit (em vez de `<form action>`),
 * para que o React não limpe os campos quando a validação falhar.
 * Qualquer falha (rede, servidor, arquivo recusado) vira mensagem no formulário:
 * a tela nunca fica presa em "Salvando...".
 */
export function useAcao(acao: Acao, confirmar?: string) {
  const segura = useCallback(
    async (anterior: Estado, dados: FormData): Promise<Estado> => {
      try {
        return await acao(anterior, dados);
      } catch (e) {
        if (ehRedirecionamento(e)) throw e;
        console.error(e);
        return falhaLocal("Não foi possível concluir o envio. Verifique a conexão e o tamanho do arquivo (máx. 4 MB) e tente novamente.");
      }
    },
    [acao],
  );
  const [estadoServidor, executar, enviando] = useActionState(segura, null);
  const [local, setLocal] = useState<Estado>(null);
  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return; // evita duplo envio
    const dados = new FormData(e.currentTarget);
    const erro = validarArquivos(dados);
    if (erro) return setLocal(falhaLocal(erro));
    if (confirmar && !window.confirm(confirmar)) return;
    setLocal(null);
    startTransition(() => executar(dados));
  };
  // mostra a mensagem mais recente (validação local ou retorno do servidor)
  const estado = local && (!estadoServidor || local.ts > estadoServidor.ts) ? local : estadoServidor;
  return { estado, enviando, aoEnviar };
}

export function Mensagem({ estado }: { estado: Estado }) {
  if (!estado) return null;
  return (
    <div
      role={estado.ok ? "status" : "alert"}
      className={clsx(
        "flex items-start gap-2.5 px-4 py-3 text-[12px] font-medium",
        estado.ok ? "poco text-acento" : "poco-erro text-erro-claro",
      )}
    >
      <span className={clsx("ponto mt-[5px]", estado.ok ? "text-acento" : "text-erro")} />
      <span>{estado.mensagem}</span>
    </div>
  );
}

/**
 * Formulário ligado a uma server action. Exibe a mensagem de retorno e limpa
 * os campos após sucesso (quando `limpar` for verdadeiro).
 */
export function FormAcao({
  acao,
  children,
  botao,
  classeBotao,
  confirmar,
  limpar = true,
  className = "space-y-4",
}: {
  acao: Acao;
  children: React.ReactNode;
  botao?: React.ReactNode;
  classeBotao?: string;
  confirmar?: string;
  limpar?: boolean;
  className?: string;
}) {
  const { estado, enviando, aoEnviar } = useAcao(acao, confirmar);
  const ref = useRef<HTMLFormElement>(null);
  const inline = className.split(" ").includes("inline");
  const rodape = botao && (
    <BotaoEnviar enviando={enviando} className={classeBotao}>
      {botao}
    </BotaoEnviar>
  );

  useEffect(() => {
    if (estado?.ok && limpar) ref.current?.reset();
  }, [estado, limpar]);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={aoEnviar}
    >
      {children}
      {inline ? (
        <>
          <Mensagem estado={estado} />
          {rodape}
        </>
      ) : (
        (estado || botao) && (
          // ocupa a linha inteira quando o formulário é um grid
          <div className="col-span-full space-y-4">
            <Mensagem estado={estado} />
            {rodape}
          </div>
        )
      )}
    </form>
  );
}
