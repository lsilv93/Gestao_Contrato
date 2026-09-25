import clsx from "clsx";
import { Download, FileText } from "lucide-react";
import { formatarBytes } from "@/lib/formatos";

type Base = { nome: string; rotulo: string; obrigatorio?: boolean; className?: string; ajuda?: React.ReactNode; /** prefixo do id (evita ids repetidos entre filtros e modais) */ prefixo?: string };

function Rotulo({ nome, rotulo, obrigatorio, prefixo = "campo" }: Base) {
  return (
    <label className="label" htmlFor={`${prefixo}-${nome}`}>
      {rotulo}
      {obrigatorio && " *"}
    </label>
  );
}

function Ajuda({ children }: { children?: React.ReactNode }) {
  return children ? <p className="mt-1.5 text-[11px] text-t3">{children}</p> : null;
}

export function Campo({
  nome,
  rotulo,
  valor,
  obrigatorio,
  className,
  ajuda,
  prefixo = "campo",
  ...resto
}: Base & { valor?: string | number | null } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  return (
    <div className={className}>
      <Rotulo nome={nome} rotulo={rotulo} obrigatorio={obrigatorio} prefixo={prefixo} />
      <input id={`${prefixo}-${nome}`} name={nome} defaultValue={valor ?? ""} required={obrigatorio} className="input" {...resto} />
      <Ajuda>{ajuda}</Ajuda>
    </div>
  );
}

export function Selecao({
  nome,
  rotulo,
  valor,
  obrigatorio,
  className,
  ajuda,
  opcoes,
  vazio,
  prefixo = "campo",
  ...resto
}: Base & {
  valor?: string | null;
  opcoes: { valor: string; rotulo: string }[];
  vazio?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  return (
    <div className={className}>
      <Rotulo nome={nome} rotulo={rotulo} obrigatorio={obrigatorio} prefixo={prefixo} />
      <select id={`${prefixo}-${nome}`} name={nome} defaultValue={valor ?? ""} required={obrigatorio} className="input" {...resto}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <Ajuda>{ajuda}</Ajuda>
    </div>
  );
}

export function AreaTexto({ nome, rotulo, valor, obrigatorio, className }: Base & { valor?: string | null }) {
  return (
    <div className={className}>
      <Rotulo nome={nome} rotulo={rotulo} obrigatorio={obrigatorio} />
      <textarea id={`campo-${nome}`} name={nome} defaultValue={valor ?? ""} required={obrigatorio} rows={3} className="input" maxLength={2000} />
    </div>
  );
}

/** Upload de PDF/Word (até 4 MB). */
export function CampoArquivo({
  rotulo = "Documento (PDF ou Word, até 4 MB)",
  obrigatorio,
  atual,
  className,
}: {
  rotulo?: string;
  obrigatorio?: boolean;
  atual?: { id: string; fileName: string; size: number } | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor="campo-arquivo">
        {rotulo}
        {obrigatorio && " *"}
      </label>
      <input
        id="campo-arquivo"
        name="arquivo"
        type="file"
        required={obrigatorio}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="input file:mr-3 file:rounded-full file:border-0 file:bg-acento/15 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-acento"
      />
      {atual && (
        <p className="mt-1.5 text-[11px] text-t3">
          Atual: <LinkArquivo arquivo={atual} /> — envie outro arquivo apenas se quiser substituí-lo.
        </p>
      )}
    </div>
  );
}

/** Link de download (a API confere o CNPJ antes de entregar o arquivo). */
export function LinkArquivo({ arquivo, compacto }: { arquivo: { id: string; fileName: string; size: number } | null | undefined; compacto?: boolean }) {
  if (!arquivo) return <span className="text-t4">—</span>;
  const ext = arquivo.fileName.split(".").pop()?.toLowerCase();
  const pdf = ext === "pdf";
  if (compacto) {
    return (
      <a href={`/api/arquivos/${arquivo.id}`} className="btn-secondary btn-sm" title={`Baixar ${arquivo.fileName} (${formatarBytes(arquivo.size)})`}>
        <Download className="h-3.5 w-3.5" /> {pdf ? "PDF" : ext === "xml" ? "XML" : "Word"}
      </a>
    );
  }
  return (
    <a href={`/api/arquivos/${arquivo.id}`} className={clsx("inline-flex items-center gap-1 font-medium text-acento hover:underline")}>
      <FileText className="h-3.5 w-3.5" /> {arquivo.fileName} <span className="text-t4">({formatarBytes(arquivo.size)})</span>
    </a>
  );
}

/** Campo oculto `voltar`: após salvar, a listagem reabre com os mesmos filtros. */
export function Voltar({ href }: { href: string }) {
  return <input type="hidden" name="voltar" value={href} />;
}
