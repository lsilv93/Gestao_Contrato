# L&K Assessoria Farmacêutica — Gestão de Contratos / Compliance

Web App da consultoria para gerir **Contratos (PJ/SPOT)**, **Licenças Sanitárias (ANVISA/VISA)**, **Manuais de Boas Práticas & POPs** e **Serviços/Faturamento (NFs)** dos clientes transportadores. Tem trilha de auditoria imutável e controle de acesso por perfil, amarrado ao CNPJ.

**Stack:** Next.js 15 (App Router, Server Actions) · React 19 · Tailwind CSS · Prisma 6 · PostgreSQL · pronto para a **Vercel**.

> Projeto **independente** do Control Tower Pallet: repositório, banco de dados, cookies de sessão (`gc_session`) e projeto Vercel próprios.

---

## Perfis de acesso (RBAC)

| Perfil | O que pode fazer |
|---|---|
| **ADM Geral** (Consultoria) | Acesso irrestrito: todos os transportadores, cadastros, edição, relatórios, auditoria e dados financeiros completos. Não fica vinculado a CNPJ. |
| **Cliente / Transportador** | Amarrado **obrigatoriamente** a um CNPJ. Somente visualização e download dos próprios **Contratos** (e validade), **Licenças Sanitárias** (e validade) e **Manuais/POPs** (PDF e Word). Nenhum botão ou rota de criação, edição, substituição ou exclusão. |

**Restrição financeira do Cliente:** não vê cobranças pagas, valores (nem de NFs, nem de contratos) ou faturamento consolidado. Vê **apenas** as cobranças **em aberto ou em atraso**: número da NF, vencimento e farol (*A vencer* / *Em atraso*). A regra é aplicada no servidor (`listarCobrancasCliente` seleciona só esses campos no banco; `listarServicos` e as métricas financeiras do dashboard são exclusivas do ADM), então valores e NFs pagas nunca chegam ao navegador do cliente — nem pela tela, nem pela API.

O controle é aplicado em **três camadas**:
1. **Middleware** (`src/middleware.ts`): exige sessão, bloqueia as rotas administrativas para o Cliente e bloqueia qualquer método de escrita na API (`POST/PUT/DELETE` → 403).
2. **Escopo por CNPJ** (`src/server/escopo.ts`): toda consulta passa por `escopoCarrier(usuario)`. Para o Cliente, o filtro é **sempre** a transportadora vinculada e qualquer filtro enviado na URL é ignorado. O vínculo é relido do banco a cada requisição, então um usuário ou transportadora inativado perde o acesso na hora.
3. **Server Actions**: toda escrita chama `exigirAdmin()`. O download de arquivos (`/api/arquivos/[id]`) confere se o documento pertence ao CNPJ do usuário e responde 404 caso contrário.

## Regras de negócio

### Farol de vencimento (`src/domain/farol.ts`)
| Farol | Regra |
|---|---|
| 🟢 Verde, "Em dia" | mais de 1 dia para o vencimento |
| 🟡 Amarelo, "Crítico" | falta 1 dia ou vence hoje |
| 🔴 Vermelho, "Vencido" | data atual > vencimento e não pago/renovado |

A antecedência do alerta amarelo está na constante `DIAS_ALERTA` (hoje = 1). Registros resolvidos (NF paga, contrato renovado/encerrado, licença renovada/cancelada) não recebem farol. As datas são comparadas pelo dia no fuso `America/Sao_Paulo`.

- **Contratos:** farol pela data de vencimento, para contratos *Vigentes*.
- **Licenças:** *Ativa* / *Próxima de Vencer* / *Vencida* são calculadas pela validade da licença vigente.
- **Manuais/POPs:** farol pela data da *próxima revisão*.
- **Faturamento:** *Atrasado* é calculado, e não gravado: uma NF *Pendente* com vencimento anterior a hoje.

### Trilha de auditoria (`src/server/auditoria.ts`)
Toda inclusão, edição ou exclusão grava, **na mesma transação**, um registro com ID da ação (**UUID** gerado pelo PostgreSQL), ID e nome do usuário, data/hora exata (`timestamptz`, exibida também em ISO 8601), tipo (CREATE/UPDATE/DELETE), entidade, ID do registro afetado e detalhes (antes/depois). A imutabilidade é garantida **no banco**: um trigger PostgreSQL bloqueia `UPDATE`, `DELETE` e `TRUNCATE` na tabela `audit_logs`.

### Licenças Sanitárias (renovação com histórico)
- **Renovar:** a versão atual passa a *Renovada*, com o snapshot completo gravado no log, e é criada uma nova versão (`version + 1`, `previousId` apontando para a anterior) com o novo PDF e a nova validade. O PDF antigo continua no histórico.
- **Alterar status / Encerrar** (Suspensa, Cancelada ou Encerrada): grava o histórico no log e **abre automaticamente** o modal de lançamento da nova licença (novo PDF + nova validade).
- **Visão por situação:** contadores clicáveis *Ativas*, *Próximas de Vencer* e *Vencidas* no topo da tela de licenças.
- **Histórico de versões:** clique em `vN` na tabela (disponível também para o Cliente).

### Manuais & POPs
PDF ou Word (.doc/.docx), versão obrigatória (ex.: v1.0, v2.1), sempre vinculado ao CNPJ da transportadora. Na edição é possível substituir o arquivo (o anterior é excluído) ou excluir o arquivo atual sem substituir — tudo auditado.

### Serviços & Faturamento
Tabela com filtros por número da NF, tipo de contrato, transportadora e status. **Quick action:** clique na linha de uma NF pendente, ou no botão **Pago**, para abrir a confirmação com a data de pagamento.

### Dashboard
Filtros **Mês/Ano** ou **Visão geral** e, para o administrador, **Transportadora**. Mostra o valor total de contratos com % e valores PJ x SPOT, as NFs emitidas, pagas, vencidas e pendentes (com totais em R$) e painéis de alerta de Contratos, Licenças (com a transportadora) e Manuais. Os contadores e os itens dos faróis abrem a listagem já filtrada.

### Inadimplência do Cliente (aviso e bloqueio)
Verificada no login **e a cada requisição** (`src/server/pendencias.ts`):
- **NF pendente ou vencida há até 30 dias** → ao entrar, pop-up *Aviso de pendência financeira* com NF, valor, vencimento, dias em atraso e botão **Baixar NF**; fecha em **OK / Ciente** (volta no próximo login).
- **NF vencida há mais de 30 dias** → acesso **suspenso**: todas as telas levam a `/bloqueio` e a API responde 403. A tela mostra a(s) NF(s), valores, vencimentos, **Baixar NF** e o contato da consultoria (variável `CONSULTORIA_CONTATO`, opcional). Durante o bloqueio o cliente só consegue baixar NFs.
- **Desbloqueio automático:** assim que o ADM marca a NF como *Paga*, o acesso volta (basta recarregar ou entrar de novo).
- `GET /api/v1/pendencias` (funciona mesmo bloqueado): `{ bloqueado, bloqueantes, avisos }`.
- O ADM anexa o **PDF da NF** no lançamento/edição em *Serviços & Faturamento*.

### Relatórios e exportação para Excel
Menu **Relatórios** (ADM e Cliente). Filtros: período (data inicial/final), transportadoras (**seleção múltipla**, ADM), status (Em dia, A vencer, Vencido, Pago, Pendente) e tipo. O botão **Exportar para Excel (.xlsx)** gera, com `exceljs`, exatamente o que está na tela (título, filtros aplicados, cabeçalho fixo, autofiltro, moeda e datas formatadas, status coloridos, totais).

| Tipo | Conteúdo |
|---|---|
| Relatório Geral de Compliance Sanitário | Transportadora, CNPJ, licença ANVISA, status, validade, dias p/ vencer, versão do Manual BPA, próxima revisão, nº de POPs |
| Faturamento & Cobranças | Transportadora, NF, tipo PJ/SPOT, valor, vencimento, pagamento, status, dias em atraso (+ total) |
| Licenças Sanitárias / Manuais & POPs | Listas detalhadas com situação pelo farol |
| Visão Geral Executiva (ADM) | Por transportadora: contratos vigentes e valor, NFs em aberto/vencidas e valores, maior atraso, licença, manuais, acesso liberado/bloqueado |

Cliente: sempre e só o próprio CNPJ; no financeiro, apenas cobranças em aberto/atraso e sem valores; sem visão executiva.

### Arquivos (PDF/Word)
Os arquivos ficam guardados **no próprio PostgreSQL** (tabela `stored_files`, até 4 MB cada) para que o download passe sempre pela checagem de CNPJ, sem links públicos. PDFs abrem no navegador; arquivos Word são baixados.

---

## Estrutura de diretórios

```
prisma/
  schema.prisma          # modelos: User, Carrier, Contract, FinancialService,
                         # SanitaryLicense, GoodPracticesManual, StoredFile, AuditLog
  migrations/            # SQL (inclui o trigger de imutabilidade da auditoria)
  seed.mjs               # administrador inicial (idempotente, roda no deploy)
  demo.mjs               # dados de demonstração (opcional)
src/
  domain/                # regras puras: farol, status derivados (sem I/O)
  lib/                   # utilitários: datas, CNPJ, moeda, sessão JWT (edge), URLs
  server/                # infraestrutura (somente servidor)
    auth.ts              #   usuário atual, requireAdmin / exigirAdmin
    escopo.ts            #   filtro por CNPJ (RBAC de dados)
    auditoria.ts         #   gravação da trilha de auditoria
    arquivos.ts          #   validação/gravação de PDF/Word
    consultas/           #   repositórios de leitura (já com escopo)
    api.ts               #   wrapper das rotas REST
  actions/               # Server Actions (casos de uso de escrita, só ADMIN)
  components/            # UI: faróis, tabelas, modal, filtros, menu, tema
  app/
    (sistema)/           # telas autenticadas: dashboard, contratos, faturamento,
                         # licencas, manuais, transportadoras, usuarios, auditoria, conta
    api/arquivos/[id]    # download com checagem de CNPJ
    api/v1/*             # API REST somente leitura (JSON)
    login/, sair/
  middleware.ts          # 1ª barreira do RBAC
```

## API (REST, somente leitura, autenticada pelo cookie de sessão)

| Rota | Perfil | Filtros |
|---|---|---|
| `GET /api/v1/me` | todos | — |
| `GET /api/v1/dashboard` | todos | `mes=YYYY-MM`, `transportadora` (Cliente: `contratos` e `faturamento` = null; só `cobrancas` e alertas) |
| `GET /api/v1/contratos` | todos | `transportadora`, `tipo`, `status`, `farol`, `busca` |
| `GET /api/v1/faturamento` | todos | ADM: `transportadora`, `tipo`, `status` (PENDING/PAID/OVERDUE/CANCELED), `nf` · Cliente: só em aberto/atraso, sem valores — `status` (PENDING/OVERDUE), `nf` |
| `GET /api/v1/licencas` | todos | `transportadora`, `status`, `farol`, `historico=1`, `busca` |
| `GET /api/v1/manuais` | todos | `transportadora`, `categoria`, `farol`, `busca` |
| `GET /api/v1/transportadoras` | ADMIN | — |
| `GET /api/v1/auditoria` | ADMIN | `entidade`, `registro`, `acao`, `usuario`, `de`, `ate`, `pagina` |
| `GET /api/arquivos/:id` | todos | download (404 se o arquivo for de outro CNPJ) |

Para o Cliente, o parâmetro `transportadora` é ignorado e o resultado vem sempre restrito ao próprio CNPJ.

---

## Deploy na Vercel (banco novo e separado)

1. Em [vercel.com/new](https://vercel.com/new), **importe o repositório `Gestao_Contrato`** como um **projeto novo** (não use o projeto do Control Tower Pallet). A Vercel detecta Next.js sozinha.
2. **Crie um banco novo:** no projeto novo, vá em *Storage → Create Database → Prisma Postgres* (ou *Neon*) e conecte. A integração cria `DATABASE_URL` automaticamente. **Não** reaproveite o banco do outro sistema.
3. Em *Settings → Environment Variables*, adicione:
   - `AUTH_SECRET`: valor aleatório longo (`openssl rand -base64 32`). **Obrigatória.**
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (opcionais): primeiro administrador (o login aceita e-mail ou nome de usuário). O padrão é `admin@consultoria.com.br` / `admin123`.
4. **Deploy.** O build roda `prisma generate → prisma migrate deploy → prisma db seed → next build` (`scripts/build.mjs`): cria as tabelas, o trigger de auditoria e o administrador.
5. Entre com o administrador, **troque a senha** em *Minha Senha*, cadastre as **Transportadoras** e depois crie os **acessos Cliente** em *Usuários & Acessos*, vinculando cada um a um CNPJ.

> Para ter dados de exemplo em um banco de testes: `DATABASE_URL=... npm run db:demo` (cria 3 transportadoras e o acesso `cliente@translog.com.br` / `cliente123`). Não rode em produção.

## Rodando localmente

```bash
cp .env.example .env            # ajuste DATABASE_URL e AUTH_SECRET
npm install
npx prisma migrate deploy
npm run db:seed                 # admin@consultoria.com.br / admin123
npm run db:demo                 # (opcional) dados de demonstração
npm run dev                     # http://localhost:3000
```

Postgres rápido via Docker:
```bash
docker run -d --name gestao-db -e POSTGRES_USER=gestao -e POSTGRES_PASSWORD=gestao -e POSTGRES_DB=gestao -p 5432:5432 postgres:16
```

| Script | Descrição |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | migrações + seed + build (o que roda na Vercel) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:migrate` | nova migração após alterar o `schema.prisma` |
| `npm run db:studio` | Prisma Studio |

## Identidade visual L&K

- **Marca:** monograma L&K (L baixo + K alto, com a diagonal que sobe formando o triângulo oculto e o "+" farmacêutico), assinatura "L&K ASSESSORIA FARMACÊUTICA · COMPLIANCE & LOGÍSTICA SANITÁRIA". Arquivos em `public/marca/` (PNG fundo claro, escuro e transparente; símbolo em SVG), acessíveis em `/marca/...`.
- **Cores:** azul-petróleo `#0B3A4A` e verde-menta `#2EDCB0` (tokens em `src/app/globals.css`; no tema claro o acento de texto é verde-petróleo `#087660` para contraste 4.5:1).
- **Tipografia:** Montserrat (títulos, rótulos, botões e marca; auto-hospedada via `@fontsource/montserrat`).

## Tema claro / escuro
O botão de sol/lua na barra superior (e na tela de login) alterna o tema. A escolha fica no **localStorage** e é aplicada por um script no `<head>` antes da pintura, sem "piscar". Sem escolha salva, o sistema segue o tema do sistema operacional.
