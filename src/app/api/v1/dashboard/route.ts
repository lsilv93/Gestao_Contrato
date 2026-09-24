import { rotaApi } from "@/server/api";
import { carregarDashboard, lerFiltroDashboard } from "@/server/consultas/dashboard";

/** ?mes=YYYY-MM (omitido = visão geral) &transportadora=<id> (somente ADMIN). */
export const GET = rotaApi((u, sp) => carregarDashboard(u, lerFiltroDashboard(sp)));
