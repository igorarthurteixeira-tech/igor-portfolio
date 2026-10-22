-- Execute no SQL Editor do Supabase.
-- Fila de publicações (vídeos e textos para as redes sociais).

create table if not exists public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  -- {"instagram": {"legenda": "..."}, "youtube": {"titulo": "...", "legenda": "..."}}
  textos jsonb not null default '{}'::jsonb,
  redes text[] not null default '{}',
  agendada_em timestamptz,
  video_path text,
  capa_path text,
  -- {"instagram": "pendente" | "publicado" | "erro"}
  status_redes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists publicacoes_agenda_idx on public.publicacoes (agendada_em);

-- Tudo passa pelas rotas do servidor (service role). Sem policies = ninguém
-- acessa a tabela direto pelo navegador.
alter table public.publicacoes enable row level security;

-- Arquivos (vídeos e capas). Privado: só links assinados criados pelo painel.
insert into storage.buckets (id, name, public, file_size_limit)
values ('publicacoes', 'publicacoes', false, 52428800)
on conflict (id) do nothing;
