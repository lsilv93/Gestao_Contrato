import { rotaApi } from "@/server/api";
import { lerFiltroAuditoria, listarAuditoria } from "@/server/consultas/auditoria";

/** Somente ADMIN. ?entidade= &registro= &acao= &usuario= &de= &ate= &pagina= */
export const GET = rotaApi(async (_u, sp) => listarAuditoria(lerFiltroAuditoria(sp)), { somenteAdmin: true });
