import { rotaApi } from "@/server/api";
import { pendenciasCliente } from "@/server/pendencias";

/**
 * Check-status financeiro do cliente (chamado no login e disponível mesmo com o acesso bloqueado):
 * { bloqueado, bloqueantes: [...> 30 dias], avisos: [...até 30 dias/a vencer] }.
 * Cada pendência traz NF, valor, vencimento, dias em atraso e o arquivo da NF
 * (download em /api/arquivos/{arquivo.id}). ADM recebe listas vazias.
 */
export const GET = rotaApi((u) => pendenciasCliente(u), { permitirBloqueado: true });
