# 🎬 Oscar Betting App

Aposte com seus amigos nos vencedores do Oscar. Este projeto web permite registrar usuários, gerenciar categorias e indicados, fazer apostas, visualizar ranking e administrar o status de apostas, com autenticação e dados persistidos via Supabase.

> Atribuição TMDB: Este produto utiliza a API do TMDB, mas não é endossado pelo TMDB.

## ✨ Recursos Principais

- Registro de usuário com verificação de e-mail (Supabase)
- Login seguro com feedback de sucesso/erro
- Proteção de rotas para áreas restritas (bets, ranking, admin)
- Gestão de categorias (Admin): listar, criar/editar e ativar/desativar
- Gestão de indicados (Admin): CRUD, importação em massa com dedupe e limite por categoria
- Enriquecimento de indicados com dados do TMDB (pôster, dados principais)
- Tipagem forte do banco de dados (Supabase types)
- UI moderna com Tailwind v4 e shadcn
- Testes com Vitest (Server Actions e UI) e CI via GitHub Actions

Atualizações recentes:
- Admin unificado em uma única página: “Configurações Globais”, “Edição da cerimônia”, “Fontes (Global Scrape)” (colapsável) e “Categorias”
- Cards de categoria expansíveis (acordeões): ao expandir, os indicados aparecem dentro do card com ações inline (TMDB, editar, excluir, vencedor)
- Criação automática de categorias por edição durante importações globais
- Suporte a edições via ceremony_year em categories, nominees e bets (com migração e índices)

Planejadas (conforme requisitos):
- Registro/gestão de apostas (UI completa)
- Gestão de Indicados (Admin) com importação rápida e enriquecimento TMDB
- Gestão de Apostas (Usuário): editar e filtrar apostas
- Visualização de apostas de outros participantes
- Registro de Vencedores (Admin)
- Ranking de Usuários
- Interrupção de Apostas (Admin)
- Homepage com dashboard e estatísticas
- Perfil do Usuário

## 🏗️ Arquitetura

- Next.js 16 (App Router) – `src/app`
  - (auth): login, registro, confirmação, esqueci/reset senha
  - (dashboard)/admin: página unificada com categorias/indicados (Server Actions)
  - (dashboard)/bets: registro/edição de apostas (actions implementadas; UI em progresso)
  - Rotas de API:
    - `src/app/api/auth/callback/route.ts` – troca de código por sessão e bootstrap de perfil
    - `src/app/api/auth/signout/route.ts`- `src/app/api/admin/categories/[id]/nominees/route.ts` – lista indicados por categoria e ano da cerimônia (usado pelos cards expansíveis)
  - Layout global:
    - `src/app/layout.tsx` (providers e Toaster)
- Supabase (helpers):
  - `src/lib/supabase/client.ts` (browser)
  - `src/lib/supabase/server.ts` (SSR; usa `await cookies()` e set/remove no-op em RSC/Actions para evitar 431)
  - `src/lib/supabase/server-mutable.ts` (rotas API que precisam set/remove de cookies)
- Autorização centralizada:
  - `src/lib/auth/requireAdmin.ts` – valida admin via `profiles.role=admin` + fallback `ADMIN_EMAILS`
- Tipos do banco:
  - `src/types/database.ts` (profiles, categories, nominees, bets, app_settings)
- Proxy (Next 16):
  - `src/proxy.ts` – matcher único que não intercepta `/_next/**` nem assets, evitando quebrar Server Actions
- Admin UI:
  - Cards de categoria expansíveis: `src/app/(dashboard)/admin/categories/ExpandableCategoryCard.tsx`
  - “Fontes (Global Scrape)” colapsáveis via `<details>` em admin/page
  - Importação global: `ImportAllFromGlobalButton`
  - Import por categoria: `ImportFromGlobalPageButton` e “Entrada rápida” por textarea dentro do card
- Scraper:
  - `src/lib/scrapers/omelete.ts` – parsing com seletores e sanitização:
    - Remove “(Leia nossa crítica)”, NBSP, dashes especiais (–, —) e parênteses vazios “()”
    - Em atuação, extrai corretamente name (ator/atriz) e meta.film_title (filme)
    - Filtro estrito por ano e domínio
- TMDB:
  - `src/lib/tmdb/client.ts` – busca e detalhes (filme/pessoa) e montagem de URL de imagem
  - UI: pôster de nominees via `next/image` + `getTmdbImageUrl`

## 🗃️ Modelo de Dados (Supabase)

Tabelas-chave em `src/types/database.ts`:
- profiles: id, name, role (user/admin)
- categories: id, name, max_nominees, is_active, ceremony_year
- nominees: id, category_id, name, meta (jsonb com film_title), tmdb_id, tmdb_data, is_winner, ceremony_year
- bets: id, user_id, category_id, nominee_id, ceremony_year
- app_settings: key/value (ex.: `bets_open`)

## 🚀 Começando

### Pré-requisitos
- Node.js 18+ (recomendado 20+)
- Conta Supabase com projeto e Postgres
- Variáveis de ambiente configuradas

### Instalação

```bash
git clone https://github.com/gavital/oscar-betting-app.git
cd oscar-betting-app
npm install
```

### Variáveis de Ambiente

Crie `.env.local` na raiz:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<sua-instancia>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Bootstrap de admins (opcional; dev)
ADMIN_EMAILS=seu.email@dominio.com,outro.admin@dominio.com
SCRAPE_DEBUG=true # logs detalhados do scraper (opcional em dev)

# TMDB
TMDB_API_KEY=<sua-api-key-tmdb>
TMDB_LANGUAGE=pt-BR
TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
TMDB_IMAGE_SIZE_LIST=w185
TMDB_IMAGE_SIZE_DETAIL=w500
```

### Configuração de Imagens (Next Image)

Em `next.config.ts`, whiteliste o host do TMDB:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
    ],
  },
};

export default nextConfig;
```

Após alterar o `next.config.ts`, reinicie o servidor (`npm run dev`).

### Desenvolvimento

```bash
npm run dev
# ou sem webpack:
npx next dev
```

Acesse http://localhost:3000

### Build e Produção

```bash
npm run build
npm start
```

Deploy recomendado: Vercel (Next.js 16).

## 🔐 Autenticação, Autorização e RLS

- Autenticação: Supabase com verificação de e-mail e rota de callback
- Autorização: `requireAdmin` centralizado; admins via `profiles.role='admin'` + fallback `ADMIN_EMAILS` em dev
- RLS sugerido:
  - Função `public.is_admin()` (SECURITY DEFINER)
  - Policies em `categories/nominees`: SELECT público; INSERT/UPDATE/DELETE apenas admin
  - Policies em `bets`: SELECT próprio ou admin; INSERT/UPDATE próprio; DELETE admin

Exemplo de função:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
  );
$$;
```
 
## 📣 Publicação de Resultados (results_published)

Para controlar a visibilidade pública do Ranking (pódio e detalhes por participante) após o registro dos vencedores, o sistema usa a chave `results_published` em `app_settings`:

- Quando `results_published = true`:
  - A página `/ranking` exibe pódio e lista completa de participantes com suas pontuações (acertos/total)
  - A página `/ranking/[userId]` exibe detalhes por categoria com “Acertou/Errou”
  - A página `/bets` (Minhas Apostas) exibe o badge “RESULTADOS PUBLICADOS”

- Quando `results_published = false`:
  - A página `/ranking` exibe uma mensagem informando que os resultados ainda não foram publicados e oculta pódio/lista
  - `/bets` não exibe o badge de resultados

### Como publicar/ocultar resultados via UI (Admin)

1. Acesse `/admin/settings` (somente admins)
2. No bloco “Publicação dos resultados”:
   - Clique em “Publicar Resultados” para tornar o ranking visível publicamente
   - Clique em “Ocultar Resultados” para ocultar o ranking (apenas admins poderão visualizar conforme policies)
3. A página confere o estado atual e exibe um badge:
   - “RESULTADOS PUBLICADOS” quando ativo
   - “RESULTADOS OCULTOS” quando desativado

### Integração Técnica

- Server Action: `setResultsPublished(formData)` em `src/app/(dashboard)/admin/settings/actions.ts`
  - Upsert em `app_settings` com `key='results_published'` e `value=true|false` (jsonb)
  - Revalida as rotas `/ranking`, `/ranking/[userId]` e `/bets` para refletir a atualização
- UI Client: `SettingsResultsForm` em `src/app/(dashboard)/admin/settings/_components/SettingsResultsForm.tsx`
  - Usa `useActionState` + toasts (sonner)
  - Exibe “Publicar Resultados” / “Ocultar Resultados” e estado “Salvando...” durante a ação

### RLS (opcional recomendado)

Para liberar leitura pública de `bets` apenas quando `results_published=true`, você pode criar uma policy RLS:
- Policy de SELECT em `bets`:
  - Permite leitura quando `public.is_admin()` for true
  - Ou quando existir uma linha em `app_settings` com `key='results_published'` e `value=true` (jsonb)
- Essa policy complementa o gating de UI e reforça a privacidade em nível de banco

> Observação: normalize o tipo de `app_settings.value` para `jsonb` boolean (`true`/`false`) nas chaves booleanas (ex.: `results_published`, `bets_open`), evitando comparações com texto.

## 🧪 Testes

- Test runner: Vitest
- Cobertura atual:
  - Server Actions: categories (create/edit/toggle), nominees (import/create/update/delete/enrich TMDB), bets (confirmBet)
  - Auth helper: requireAdmin
  - UI:
    - LoginPage (RTL + jsdom)
    - EditCategoryForm (RTL + jsdom)
    - NomineeItemActions (TMDB/Update/Delete)
- Mocks principais:
  - Supabase client (encadeável: eq/ilike/neq, count head:true, update/delete thenable, upsert onConflict)
  - `next/cache` (revalidatePath no-op)
  - `global.fetch` para TMDB (stub global)
- Comandos:
```bash
npm run test
npm run test:watch
```

## 🖥️ UI do Admin – Fluxo Atual

Página unificada em `/admin`:

- Configurações Globais:
  - “Apostas Abertas/Fechadas”
  - “Publicação dos Resultados”
- Edição da Cerimônia:
  - Campo “Ano” (setCeremonyYear)
  - Botão “Nova Edição (mudar ano)” (startNewEdition)
  - Botão “Limpar dados da edição atual” (purgeCurrentEdition)
- Fontes (Global Scrape):
  - Bloco colapsável `<details>` com:
    - “Importar tudo (global)”
    - Lista/CRUD de fontes globais (SettingsScrapeSourcesForm)
- Categorias:
  - Grade de cards
  - Cada card tem:
    - Toggle Ativa/Inativa
    - Botão “Expandir/Recolher”
    - Ao expandir:
      - Carrega indicados on-demand via GET `/api/admin/categories/[id]/nominees?year=YYYY`
      - “Entrada Rápida” para importação manual
      - Botão “Import from Global Page” (scrape por categoria)
      - Ações por indicado: enriquecimento TMDB, editar nome, excluir e marcar vencedor
    - Quando expandido, o card ocupa a largura total (col-span-full)
      e exibe conteúdo completo (overflow visível)

Observações:
- Importações globais criam categorias automaticamente para o ano corrente (ceremony_year)
- Importações rápidas também salvam ceremony_year e revalidam `/admin`
- Os cards expansíveis exibem meta.film_title sob o nome do indicado quando disponível

## 🎯 Funcionalidades (status)

Usuário:
- Registro, Login, Confirmar e-mail – OK
- “Esqueci minha senha” – em progresso (UI presente; ligar ao fluxo)
- Minhas Apostas & edição – em progresso (actions cobertas; UI a construir)
- Ranking e comparações – planejado
- Perfil – planejado

Admin:
- Categorias: listar, criar, editar, ativar/desativar – OK
- Indicados: CRUD, importação em massa, TMDB enrich – OK
- Registro de vencedores – planejado
- Controle de apostas (abertas/fechadas) – planejado

## 🧰 Integração TMDB

- Client: `src/lib/tmdb/client.ts`
  - `searchMovieByName`, `searchPersonByName`, `getTmdbImageUrl`
- UI:
  - Miniatura do pôster na lista de indicados via `next/image` + `getTmdbImageUrl`
- Server Action `enrichNomineeWithTMDB`:
  - Busca TMDB; captura erros (`TMDB_FETCH_FAILED`) e trata `TMDB_NO_RESULTS`
  - Atualiza `tmdb_id` e `tmdb_data` no Supabase

> Este produto utiliza a API do TMDB, mas não é endossado pelo TMDB.

## 🪵 Logging do Scraper

- Ative `SCRAPE_DEBUG=true` em `.env.local` para logs detalhados:
  - Headings por categoria, contagem de lists, parsing por item
  - Sanitização aplicada (crítica/NBSP/dashes/parênteses)
  - Resumo de categorias detectadas e contagem de itens
- Logs aparecem no console do servidor durante “Importar tudo (global)” e “Import from Global Page”

## 🧭 Padrões e Convenções

- Server Actions para mutações (admin e bets)
- Helpers Supabase em `lib/supabase/*`; cookies no SSR com `await cookies()` (Next 16)
- Providers: `SupabaseProvider`, `TanstackProvider`
- `requireAdmin` em `lib/auth/requireAdmin`
- Tipos do banco: `types/database.ts`

## 🧯 Troubleshooting

- 431 Request Header Fields Too Large:
  - Em RSC/Actions, não mutar cookies (helpers SSR com set/remove no-op); limpe cookies `sb-*` se necessário
- Dynamic APIs:
  - `cookies()`, `headers()`, `searchParams`, `params` retornam Promise: use `await` em Server Components
- Roteamento dinâmico (Next 16):
  - `params` pode ser Promise nas rotas: desembale com `await` antes de usar (`ctx.params` → `await ctx.params`)
- Admin UI:
  - Se “Indicados por Categoria” aparecer fora dos cards, remova a seção antiga e use apenas ExpandableCategoryCard
  - Se um card expandido não mostrar o conteúdo completo, verifique se aplica `col-span-full` e `overflow-visible` quando expandido
- next/image “unconfigured host”:
  - Adicione `image.tmdb.org` em `images.remotePatterns` e reinicie o dev server
- 431 Request Header Fields Too Large:
  - Em RSC/Actions, não mutar cookies (helpers SSR com set/remove no-op); limpe cookies `sb-*` se necessário
- next/image “unconfigured host”:
  - Adicione `image.tmdb.org` em `images.remotePatterns` e reinicie dev server
- Server Actions:
  - Em arquivos `'use server'`, exporte apenas funções async; mova utilitários síncronos para `utils.ts`
- Vitest:
  - Mock de `revalidatePath` e `global.fetch` no setup; `vi.spyOn(module)` requer importar o módulo (ex.: `import * as Auth from '@/lib/auth/requireAdmin'`)

## 🧭 Mapeamento dos Requisitos para Implementação

1. Registro de Usuário
   - Implementado: tela de registro, verificação por e-mail, reenvio com cooldown (30s), feedback visual
   - Pendente: e-mail automático após alteração de senha

2. Login Seguro
   - Implementado: tela de login com feedback e redirecionamento
   - Pendente: fluxo completo “Esqueci minha senha” (UI presente; ligar ao fluxo)

3. Gestão de Categorias (Admin)
   - Implementado: listar, criar, editar (nome e número de indicados), ativar/desativar
   - Validações: duplicidade case-insensitive; limites 1–20

4. Gestão de Indicados (Admin)
   - Implementado: CRUD, importação em massa com dedupe e limite por categoria, enriquecimento via TMDB (pôster e dados principais)
   - Tratamento: impede exclusão com apostas associadas; feedback e revalidação de página

5. Registro de Apostas
   - Implementado (Server Action): upsert por (user_id, category_id), validações de categoria ativa e nominee da categoria
   - Pendente: UI por categoria (seleção e confirmação), barra de progresso

6. Gestão de Apostas (Usuário)
   - Pendente: listagem, edição, filtros por status

7. Visualização de Apostas de Outros Participantes
   - Pendente: ranking detalhado e comparação

8. Registro de Vencedores (Admin)
   - Pendente: registrar vencedor por categoria, navegação rápida

9. Ranking de Usuários
   - Pendente: cálculo e exibição de pódio e lista

10. Interrupção de Apostas (Admin)
   - Pendente: status global (app_settings), notificações e agendamento

11. Homepage do Web App
   - Pendente: dashboard com status do Oscar, estatísticas e ações rápidas

12. Perfil do Usuário
   - Pendente: visualização/edição; segurança e notificações

## 🛠️ Tecnologias

- Next.js 16, React 19
- Supabase (@supabase/ssr)
- Tailwind CSS v4
- shadcn UI
- TanStack React Query
- zod, react-hook-form
- lucide-react, sonner

## 🔒 Segurança e Boas Práticas

- Não commitar segredos (use `.env.local`)
- HTTPS em produção
- Cooldown no reenvio de e-mail de confirmação (implementado: 30s)
- Validação de entrada e feedback claro ao usuário
- Princípios SOLID e separação de responsabilidades (UI vs ações do servidor)
- Evitar duplicações (categorias/indicados)
- Sanitização e autorização consistente baseada em `profiles.role`

## 📦 Scripts

- `dev` — desenvolvimento (Next 16)
- `build` — build de produção
- `start` — servidor de produção
- `lint` — linting
- `test`, `test:watch` — testes

## 🤖 CI

- Workflow: `.github/workflows/ci.yml`
  - Node 20; cache npm; lint, build, test
  - Env dummy para testes (sem dependências externas)

## 🗺️ Roadmap

- UI completa de Apostas e Minhas Apostas
- Registro de vencedores e cálculo de Ranking
- Página de Ranking (pódio e detalhes por usuário)
- Controle de Apostas (abertas/fechadas) com agendamento e mensagem
- Homepage com estatísticas
- Perfil do usuário e “Esqueci minha senha”
- E2E com Playwright

Atualizações recém-concluídas:
- UI de Admin unificada com “Fontes” colapsáveis
- Cards de categoria expansíveis com indicados inline
- Criação automática de categorias por edição (ceremony_year)

## 🤝 Contribuição

Contribuições são bem-vindas! Abra issues e PRs com descrições claras. Priorize segurança, performance e qualidade.

## 📄 Licença

Nenhuma licença especificada no momento. Recomenda-se adicionar um arquivo LICENSE para clarificar o uso.