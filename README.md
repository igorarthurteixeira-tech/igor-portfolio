# igor-portfolio

Portfólio de Igor Arthur — https://igorarthurdev.com.br

Next.js 16 (App Router) · React 19 · Tailwind 4 · TypeScript · Supabase. Deploy na Vercel.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # http://localhost:3000
npm run build && npm start   # versão de produção
npm run lint
```

## Onde editar o conteúdo

| O quê | Arquivo |
| --- | --- |
| Textos, contato, "como funciona", stack, formação | `lib/site.ts` |
| Projetos (home, biblioteca e currículo) | `lib/projects.ts` |
| Layout do currículo em PDF | `lib/CurriculoDocument.tsx` |
| Cores e componentes de estilo | `app/globals.css` |

O currículo (`/api/curriculo`) e a home leem das mesmas fontes, então basta
editar uma vez. Projetos com `featured: true` aparecem na home e no currículo.
Para mostrar uma captura de tela, coloque a imagem em `public/projetos/` e
preencha `image` no projeto.

## Chat, métricas e painel

- **Chat:** o balão no canto da tela conduz uma conversa (nome, e-mail, mensagem)
  e grava em `mensagens`. O link "Contato" do menu abre o mesmo chat.
- **Métricas:** `components/Tracker.tsx` registra visualizações e cliques em
  `eventos` (sem IP; só um id de sessão anônimo). Para contar um clique que
  não é link, use `data-track="nome"` no elemento.
- **Painel:** `/admin` (login por e-mail e senha, só o `ADMIN_EMAIL`) mostra
  números, gráfico, origem do tráfego e as mensagens.
- **Banco:** o schema está em `supabase/migrations/`. Variáveis em `.env.example`.
  As APIs públicas têm limite por IP (`lib/rate-limit.ts`).

## Estrutura

- `app/page.tsx` — home
- `app/projetos/page.tsx` — biblioteca completa
- `app/admin/` — painel e login
- `app/api/` — `mensagens`, `eventos` e `curriculo`
- `components/ChatBubble.tsx` — balão e janela de chat
- `proxy.ts` — protege `/admin`
