"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FileText, UploadCloud, X } from "lucide-react";
import type { Estado } from "@/actions/estado";
import { BotaoEnviar, MAX_ARQUIVO, Mensagem } from "./FormAcao";

type Acao = (estado: Estado, form: FormData) => Promise<Estado>;

const ACEITOS = ["pdf", "doc", "docx"];
/** Cada requisição leva no máximo ~4 MB de arquivos (a Vercel recusa acima de 4,5 MB). */
const MAX_PACOTE = 4 * 1024 * 1024;
const tamanho = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);

/** Agrupa os arquivos em pacotes de até MAX_PACOTE, mantendo a ordem. */
function empacotar(arquivos: File[]): File[][] {
  const pacotes: File[][] = [];
  let atual: File[] = [];
  let soma = 0;
  for (const f of arquivos) {
    if (atual.length && soma + f.size > MAX_PACOTE) {
      pacotes.push(atual);
      atual = [];
      soma = 0;
    }
    atual.push(f);
    soma += f.size;
  }
  if (atual.length) pacotes.push(atual);
  return pacotes;
}

/**
 * Formulário de cadastro em lote: os campos (children) valem para TODOS os
 * arquivos. Aceita vários PDFs/Word por seleção múltipla ou arrastar-e-soltar.
 * Lotes grandes são enviados em pacotes; o progresso aparece no botão.
 */
export function FormLoteArquivos({
  acao,
  children,
  sucessoHref,
  rotuloBotao = "Cadastrar documentos",
}: {
  acao: Acao;
  children: React.ReactNode;
  /** para onde voltar ao concluir (a mensagem vai em ?ok=) */
  sucessoHref: string;
  rotuloBotao?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [estado, setEstado] = useState<Estado>(null);
  const [progresso, setProgresso] = useState<string | null>(null);

  function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    const novos = [...lista];
    const invalido = novos.find((f) => !ACEITOS.includes(f.name.split(".").pop()?.toLowerCase() ?? ""));
    const grande = novos.find((f) => f.size > MAX_ARQUIVO);
    if (invalido) setEstado({ ok: false, mensagem: `"${invalido.name}" não é PDF ou Word (.pdf, .doc, .docx).`, ts: Date.now() });
    else if (grande) setEstado({ ok: false, mensagem: `"${grande.name}" tem ${tamanho(grande.size)}; o limite é 4 MB por arquivo.`, ts: Date.now() });
    else setEstado(null);
    const validos = novos.filter((f) => f !== invalido && f !== grande && ACEITOS.includes(f.name.split(".").pop()?.toLowerCase() ?? "") && f.size <= MAX_ARQUIVO);
    // ignora duplicados (mesmo nome e tamanho)
    setArquivos((atuais) => [...atuais, ...validos.filter((f) => !atuais.some((a) => a.name === f.name && a.size === f.size))]);
    if (input.current) input.current.value = "";
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (progresso) return;
    if (!arquivos.length) return setEstado({ ok: false, mensagem: "Selecione ou arraste ao menos um arquivo (PDF ou Word).", ts: Date.now() });
    const campos = new FormData(e.currentTarget);
    campos.delete("arquivos");
    const pacotes = empacotar(arquivos);
    const lote = `lote-${Date.now().toString(36)}`;
    let enviados = 0;
    setEstado(null);
    try {
      for (const [i, pacote] of pacotes.entries()) {
        setProgresso(`Enviando ${enviados + 1}–${enviados + pacote.length} de ${arquivos.length}...`);
        const dados = new FormData();
        campos.forEach((v, k) => dados.append(k, v));
        dados.set("lote", lote);
        pacote.forEach((f) => dados.append("arquivos", f));
        const r = await acao(null, dados);
        if (!r?.ok) {
          // os pacotes anteriores já foram gravados: tira-os da lista e mostra o erro
          setArquivos((a) => a.slice(enviados));
          setEstado({ ok: false, mensagem: `${enviados ? `${enviados} arquivo(s) cadastrado(s); ` : ""}pacote ${i + 1} recusado: ${r?.mensagem ?? "erro desconhecido"}`, ts: Date.now() });
          return;
        }
        enviados += pacote.length;
      }
      router.replace(`${sucessoHref}${sucessoHref.includes("?") ? "&" : "?"}ok=${encodeURIComponent(`${enviados} documento(s) cadastrado(s) com os mesmos dados.`)}`, { scroll: false });
      router.refresh();
    } catch {
      setArquivos((a) => a.slice(enviados));
      setEstado({ ok: false, mensagem: `${enviados ? `${enviados} arquivo(s) cadastrado(s). ` : ""}Falha de conexão no envio — tente de novo com os arquivos restantes.`, ts: Date.now() });
    } finally {
      setProgresso(null);
    }
  }

  const total = arquivos.reduce((a, f) => a + f.size, 0);

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      {children}
      <div className="sm:col-span-2">
        <span className="label">Arquivos (PDF ou Word, até 4 MB cada) *</span>
        <label
          htmlFor="campo-arquivos"
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            adicionar(e.dataTransfer.files);
          }}
          className={clsx(
            "poco flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-7 text-center transition-colors",
            arrastando ? "border-acento bg-acento/10" : "border-t4/30",
          )}
        >
          <UploadCloud className="h-7 w-7 text-acento" />
          <span className="text-[12px] font-semibold text-t1">Arraste os arquivos aqui ou clique para selecionar</span>
          <span className="text-[11px] text-t3">Vários de uma vez — todos recebem a mesma transportadora, categoria, versão e revisão.</span>
          <input
            ref={input}
            id="campo-arquivos"
            name="arquivos"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(e) => adicionar(e.target.files)}
          />
        </label>
        {arquivos.length > 0 && (
          <ul className="mt-3 space-y-1.5" aria-label="Arquivos selecionados">
            {arquivos.map((f, i) => (
              <li key={`${f.name}-${f.size}`} className="poco flex items-center justify-between gap-3 px-4 py-2">
                <span className="flex min-w-0 items-center gap-2 text-[12px] text-t1">
                  <FileText className="h-3.5 w-3.5 flex-none text-acento" />
                  <span className="truncate">{f.name}</span>
                  <span className="num flex-none text-[10px] text-t4">{tamanho(f.size)}</span>
                </span>
                <button
                  type="button"
                  className="btn-icone !h-7 !w-7 flex-none"
                  aria-label={`Remover ${f.name}`}
                  disabled={!!progresso}
                  onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            <li className="px-1 text-[11px] text-t3">
              {arquivos.length} arquivo(s) · {tamanho(total)}
            </li>
          </ul>
        )}
      </div>
      <div className="col-span-full space-y-4">
        <Mensagem estado={estado} />
        <BotaoEnviar enviando={!!progresso} textoEnviando={progresso ?? "Enviando..."}>
          {rotuloBotao}
          {arquivos.length > 1 ? ` (${arquivos.length})` : ""}
        </BotaoEnviar>
      </div>
    </form>
  );
}
