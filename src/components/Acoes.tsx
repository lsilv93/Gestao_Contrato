import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { Estado } from "@/actions/estado";
import { FormAcao } from "./FormAcao";
import { Voltar } from "./Campos";

type Acao = (estado: Estado, form: FormData) => Promise<Estado>;

export function BotaoEditar({ href }: { href: string }) {
  return (
    <Link href={href} className="btn-secondary btn-sm" scroll={false}>
      <Pencil className="h-3.5 w-3.5" /> Editar
    </Link>
  );
}

/** Exclusão com confirmação (gera log DELETE). */
export function BotaoExcluir({
  acao,
  id,
  voltar,
  descricao,
  rotulo = "Excluir",
  confirmacao,
}: {
  acao: Acao;
  id: string;
  voltar: string;
  descricao: string;
  rotulo?: string;
  confirmacao?: string;
}) {
  return (
    <FormAcao
      acao={acao}
      className="inline"
      confirmar={confirmacao ?? `${rotulo} ${descricao}? Esta ação fica registrada na trilha de auditoria.`}
      botao={
        <>
          <Trash2 className="h-3.5 w-3.5" /> {rotulo}
        </>
      }
      classeBotao="btn-danger btn-sm"
    >
      <input type="hidden" name="id" value={id} />
      <Voltar href={voltar} />
    </FormAcao>
  );
}
