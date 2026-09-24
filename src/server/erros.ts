/** Erro de regra de negócio: a mensagem é exibida ao usuário. */
export class ErroNegocio extends Error {}

/** Acesso negado (perfil sem permissão ou registro de outro CNPJ). */
export class AcessoNegado extends ErroNegocio {
  constructor(msg = "Você não tem permissão para esta operação.") {
    super(msg);
  }
}
