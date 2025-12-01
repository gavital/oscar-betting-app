# 🎬 Oscar Betting App

Aposte com seus amigos nos vencedores do Oscar. Este projeto web permite registrar usuários, gerenciar categorias e indicados, fazer apostas, visualizar ranking e administrar o status de apostas, com autenticação e dados persistidos via Supabase.

## ✨ Recursos Principais

- Registro de usuário com verificação de e-mail (Supabase)
- Login seguro com feedback de sucesso/erro
- Proteção de rotas para áreas restritas (bets, ranking, admin)
- Gestão de categorias (Admin): listar e criar categorias
- Tipagem forte do banco de dados (Supabase types)
- UI moderna com Tailwind v4 e shadcn

Planejadas (conforme requisitos):
- Gestão de Indicados (Admin) com importação rápida e enriquecimento IMDB
- Registro de Apostas (Usuário) com visual atraente e dados IMDB
- Gestão de Apostas (Usuário): editar e filtrar apostas
- Visualização de Apostas de Outros Participantes
- Registro de Vencedores (Admin)
- Ranking de Usuários
- Interrupção de Apostas (Admin)
- Homepage com dashboard e estatísticas
- Perfil do Usuário

## 🏗️ Arquitetura

- Next.js App Router (`src/app`)
  - Autenticação:
    - `src/app/(auth)/login/page.tsx`
    - `src/app/(auth)/register/page.tsx`
    - `src/app/(auth)/confirm/page.tsx`
    - `src/app/(auth)/forgot-password/page.tsx`
    - `src/app/(auth)/reset-password/page.tsx`
  - Admin:
    - `src/app/(dashboard)/admin/layout.tsx` (verifica role admin)
    - `src/app/(dashboard)/admin/categories/*` (listagem/criação/edição)
    - `src/app/(dashboard)/admin/nominees/*` (importação em massa, CRUD)
  - API Routes:
    - `src/app/api/auth/callback/route.ts` (troca code por sessão)
    - `src/app/api/auth/signout/route.ts`
  - Layout global:
    - `src/app/layout.tsx` (providers e Toaster)
- Supabase (helpers):
  - `src/lib/supabase/client.ts` (browser)
  - `src/lib/supabase/server.ts` (SSR – sem mutação de cookies em RSC/Actions)
  - `src/lib/supabase/server-mutable.ts` (rotas API com mutação de cookies)
- Providers:
  - `src/providers/SupabaseProvider.tsx`
  - `src/providers/TanstackProvider.tsx`
- Tipagem do banco:
  - `src/types/database.ts` (profiles, categories, nominees, bets, app_settings)
- Proxy (substitui middleware no Next 16):
  - `src/proxy.ts` (não intercepta rotas internas `/_next/**`)

## 🗃️ Modelo de Dados (Supabase)

Tabelas-chave em `src/types/database.ts`:
- profiles: id, name, role (user/admin)
- categories: id, name, max_nominees, is_active
- nominees: id, category_id, name, imdb_id, imdb_data, is_winner
- bets: id, user_id, category_id, nominee_id
- app_settings: key/value (ex.: status de apostas e mensagens)

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
NEXT_PUBLIC_SUPABASE_URL=https://<sua-instancia>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000
Dica: se observar inconsistências com Server Actions em dev, teste sem `--webpack`:
```bash
npx next dev
```

### Build e Produção

```bash
npm run build
npm start
```

Deploy recomendado: Vercel (Next.js 16).

## 🔐 Autenticação, Autorização e Proteção de Rotas

- Autenticação via Supabase, com fluxo de verificação por e-mail
- Proteção baseada em `profiles.role` (user/admin) nas páginas do dashboard
- Server Actions realizam mutações com `createServerSupabaseClient` (SSR) e revalidam rotas

### Helpers SSR do Supabase

- `src/lib/supabase/server.ts`:
  - Usa `await cookies()` (Next 16 Dynamic API)
  - Não muta cookies em Server Components/Server Actions (set/remove no-op) para evitar erro 431
- `src/lib/supabase/server-mutable.ts`:
  - Para rotas de API que precisam persistir cookies (ex.: `GET /api/auth/callback`, signout)

### Proxy no Next 16

- `src/proxy.ts`: um único `matcher` exclui rotas internas `/_next/**` e assets estáticos
- Não colocar lógica de autenticação no proxy; autorização é feita nas páginas/actions

## 👩‍💻 Funcionalidades por Perfil

Usuário:
- Registro, Login, Confirmação de Email
- Futuro: Minhas Apostas, Visualização e Edição de Apostas, Ranking, Perfil

Admin:
- Gestão de Categorias (listagem e criação já implementadas)
- Futuro: Gestão de Indicados, Registro de Vencedores, Controle de Apostas (abertas/fechadas)

## 🧭 Mapeamento dos Requisitos para Implementação

1. Registro de Usuário
   - Implementado: tela de registro, verificação por e-mail, resend com cooldown (30s), feedback visual
   - Pendente: email ao alterar senha (trilho via Supabase Auth e hooks de update)

2. Login Seguro
   - Implementado: tela de login com feedback e redirecionamento
   - Pendente: fluxo “Esqueci minha senha” (link existe; implementar rota e UI)

3. Gestão de Categorias (Admin)
   - Implementado: listar, criar, validação de duplicados
   - Pendente: editar, ativar/desativar (toggleCategoryActive), validação adicional

4. Gestão de Indicados (Admin)
   - Implementado: CRUD, importação em massa
   - Pendente: integração IMDB

5. Registro de Apostas
   - Pendente: UI por categoria, seleção de indicado, confirmação e progresso

6. Gestão de Apostas (Usuário)
   - Pendente: listagem, edição, filtros, status visual

7. Visualização de Apostas de Outros
   - Pendente: ranking detalhado e comparação

8. Registro de Vencedores (Admin)
   - Pendente: registrar vencedor por categoria, navegação rápida

9. Ranking de Usuários
   - Pendente: cálculo e exibição de pódio e lista

10. Interrupção de Apostas (Admin)
   - Pendente: status global (app_settings), notificações e agendamento

11. Homepage
   - Pendente: dashboard com status do Oscar, estatísticas, pódio e ações rápidas

12. Perfil do Usuário
   - Pendente: visualização e edição de dados, segurança e notificações

## 🛠️ Tecnologias

- Next.js 16, React 19
- Supabase (@supabase/ssr)
- Tailwind CSS v4
- shadcn UI
- TanStack React Query
- zod, react-hook-form
- lucide-react, sonner

## 📚 Padrões e Convenções

- Server Actions para operações no Admin (ex.: `createCategory`)
- Cookies para Supabase (helpers em `src/lib/supabase/server.ts`)
- Providers no layout (`SupabaseProvider`, `TanstackProvider`)
- Tipos fortes do banco gerados em `src/types/database.ts`
- Rotas App Router em `src/app`, com agrupadores por segmento `(auth)`, `(dashboard)`


## 🔒 Segurança e Boas Práticas

- Não commitar segredos (use `.env.local`)
- HTTPS em produção
- Cooldown no reenvio de e-mail de confirmação (implementado: 30s)
- Validação de entrada e feedback claro ao usuário
- Princípios SOLID e separação de responsabilidades (UI vs ações do servidor)
- Evitar duplicações (categorias/indicados)
- Sanitização e autorização consistente baseada em `profiles.role`

## 📦 Scripts

- `npm run dev` — desenvolvimento (Next 16, Webpack habilitado)
- `npm run build` — build de produção
- `npm start` — servidor de produção
- `npm run lint` — linting

## 🗺️ Roadmap

- Implementar `toggleCategoryActive` para Admin
- Implementar gestão completa de Indicados com importação e IMDB
- Construir páginas de Apostas e Minhas Apostas
- Registrar Vencedores e atualizar o Ranking
- Página de Ranking com pódio e detalhes por usuário
- Controle de Apostas (abertas/fechadas) com agendamento e mensagem
- Homepage com estatísticas e conteúdo IMDB
- Perfil do usuário e “Esqueci minha senha”
- Suite de testes e documentação de API interna

## 🤝 Contribuição

Contribuições são bem-vindas! Abra issues e PRs com descrições claras e foque em segurança, performance e qualidade.

## 📄 Licença

Nenhuma licença especificada no momento. Recomenda-se adicionar um arquivo LICENSE para clarificar o uso.

## 📄 Licença

Sem licença definida no momento. Recomenda-se adicionar um arquivo LICENSE.