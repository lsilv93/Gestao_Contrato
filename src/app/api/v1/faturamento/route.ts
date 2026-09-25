import { rotaApi } from "@/server/api";
import { lerFiltroCobrancas, lerFiltroFaturamento, listarCobrancasCliente, listarServicos } from "@/server/consultas/faturamento";

/**
 * ADM Geral: faturamento completo — ?transportadora= &tipo=PJ|SPOT &status=PENDING|PAID|OVERDUE|CANCELED &nf=
 * Cliente: somente cobranças em aberto/em atraso do próprio CNPJ, sem valores — ?status=PENDING|OVERDUE &nf=
 */
export const GET = rotaApi((u, sp) => (u.perfil === "ADMIN" ? listarServicos(u, lerFiltroFaturamento(sp)) : listarCobrancasCliente(u, lerFiltroCobrancas(sp))));
