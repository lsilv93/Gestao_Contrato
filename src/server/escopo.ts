import "server-only";
import type { UsuarioAtual } from "./auth";

/**
 * RBAC por CNPJ: filtro obrigatório em TODA consulta de dados de transportadora.
 *  - CLIENT: sempre restrito à própria transportadora (ignora o filtro pedido).
 *  - ADMIN: todas, ou a transportadora escolhida no filtro.
 */
export function escopoCarrier(u: UsuarioAtual, carrierIdFiltro?: string | null): { carrierId?: string } {
  if (u.perfil === "CLIENT") return { carrierId: u.carrier?.id ?? "__sem_vinculo__" };
  return carrierIdFiltro ? { carrierId: carrierIdFiltro } : {};
}

/** O registro pertence ao escopo do usuário? */
export function podeVer(u: UsuarioAtual, carrierId: string): boolean {
  return u.perfil === "ADMIN" || u.carrier?.id === carrierId;
}
