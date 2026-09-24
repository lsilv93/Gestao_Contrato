import { rotaApi } from "@/server/api";
import { lerFiltroFaturamento, listarServicos } from "@/server/consultas/faturamento";

/** ?transportadora= &tipo=PJ|SPOT &status=PENDING|PAID|OVERDUE|CANCELED &nf= */
export const GET = rotaApi((u, sp) => listarServicos(u, lerFiltroFaturamento(sp)));
