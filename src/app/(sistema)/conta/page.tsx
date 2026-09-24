import { alterarSenha } from "@/actions/auth";
import { FormAcao } from "@/components/FormAcao";
import { Campo } from "@/components/Campos";
import { Cabecalho, Painel } from "@/components/ui";
import { requireUsuario } from "@/server/auth";

export const metadata = { title: "Minha Senha" };

export default async function ContaPage() {
  const u = await requireUsuario();
  return (
    <>
      <Cabecalho titulo="Minha Senha" descricao={`${u.nome} · ${u.email}`} />
      <Painel className="max-w-md">
        <FormAcao acao={alterarSenha} botao="Alterar senha">
          <Campo nome="atual" rotulo="Senha atual" type="password" obrigatorio autoComplete="current-password" />
          <Campo nome="nova" rotulo="Nova senha" type="password" obrigatorio minLength={6} autoComplete="new-password" />
          <Campo nome="confirmacao" rotulo="Confirme a nova senha" type="password" obrigatorio minLength={6} autoComplete="new-password" />
        </FormAcao>
      </Painel>
    </>
  );
}
