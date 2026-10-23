-- Execute no SQL Editor do Supabase (depois do arquivo 20261022010000_publicacoes.sql).
-- Conexões com as redes sociais (token guardado só no servidor) e detalhes de cada publicação.

create table if not exists public.redes_conexoes (
  rede text primary key,
  conta_id text not null,
  conta_nome text,
  token text not null,
  expira_em timestamptz,
  atualizado_em timestamptz not null default now()
);

-- Sem policies = ninguém acessa pelo navegador, só o servidor (service role).
alter table public.redes_conexoes enable row level security;

alter table public.publicacoes
  add column if not exists detalhes_redes jsonb not null default '{}'::jsonb;
