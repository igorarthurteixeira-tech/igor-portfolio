-- Séries criadas pelo painel de Publicações (as antigas continuam no código).
create table if not exists public.series_painel (
  slug text primary key,
  titulo text not null,
  chamada text not null default '',
  descricao text not null default '',
  capa text,
  chat jsonb,
  destaque boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Tudo passa pelas rotas do servidor (service role).
alter table public.series_painel enable row level security;

-- Dados do episódio quando a série vem do painel: {titulo, resumo, duracao, poster}
alter table public.publicacoes add column if not exists ep jsonb;

-- Imagens das séries (capa da série e imagem de cada episódio): públicas, pois o site as exibe.
insert into storage.buckets (id, name, public, file_size_limit)
values ('series', 'series', true, 5242880)
on conflict (id) do nothing;
