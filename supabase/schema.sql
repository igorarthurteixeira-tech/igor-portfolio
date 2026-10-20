-- Execute no SQL Editor do Supabase.
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('view', 'click')),
  caminho text not null,
  alvo text,
  sessao text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists eventos_created_idx on public.eventos (created_at desc);
create index if not exists eventos_tipo_idx on public.eventos (tipo, created_at desc);
create index if not exists mensagens_created_idx on public.mensagens (created_at desc);

-- Tudo passa pelas rotas do servidor (service role). Sem policies = ninguém
-- acessa as tabelas direto pelo navegador.
alter table public.mensagens enable row level security;
alter table public.eventos enable row level security;
