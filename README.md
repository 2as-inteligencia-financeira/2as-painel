# 2AS Painel

Painel financeiro executivo construído com React, Vite e funções serverless na Vercel.

Repositório: [github.com/2as-inteligencia-financeira/2as-painel](https://github.com/2as-inteligencia-financeira/2as-painel).

## Node

Use **Node 22** (`package.json` em `engines` e arquivo `.nvmrc`). Na Vercel, em Project → Settings → General → Node.js Version, mantenha **22.x** (evita divergência com o desenvolvimento e com o CI).

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build local

```bash
npm run build
```

## GitHub Actions

Cada PR e cada push para `main` roda lint, testes (Vitest) e build (`npm ci`, `npm run lint`, `npm run test`, `npm run build`). Dependências recebem atualizações semanais via Dependabot (npm e workflows).

Branches de feature sem PR não disparam CI no push para economizar fila; ao abrir o PR os checks aparecem.

## Vercel (produção e preview)

1. Projeto ligado ao repositório com **Framework Preset: Vite** (ou inferência automática), **Install** `npm install`, **Build** `npm run build`, **Output** `dist`.

2. **Variáveis de ambiente**: copiar do `.env.example` para o painel Production e Preview conforme uso. Principais grupos:

   - **API / dados**: credenciais de planilhas, `GOOGLE_*`, `GRANATUM_*`, overrides `SHEET_*` quando aplicável.
   - **Autenticação do proxy de planilhas**: `PANEL_BASIC_AUTH_USER` / `PANEL_BASIC_AUTH_PASSWORD` (serverless `/api/sheets`).
   - **Frontend (build)** — sempre que mudar algo no menu de orçamento externo ou integrações públicas:

     `VITE_URL_MODULO_ORCAMENTO` (URL absoluta publicada do app de orçamento, se usar o link no menu),

     Supabase público conforme já configurado (`VITE_*` esperados pelo Vite/`import.meta.env`).

3. **`vercel.json`**: SPA rewrite para todas as rotas exceto `/api/*` e headers de segurança; não commitar `.vercel/` nem `.env*` com segredo.

Para domínios customizados (ex.: `financas.2asfinancas.com`), configure em Project → Domains na Vercel apontando DNS conforme instruções do painel.

## Módulo de orçamento (app à parte)

Deploy do app dedicado à orçamento em outro projeto/repositório Vercel. Defina como URL público HTTPS esse deploy em **`VITE_URL_MODULO_ORCAMENTO`** aqui para o item “Módulo Orçamento” aparecer no menu.
