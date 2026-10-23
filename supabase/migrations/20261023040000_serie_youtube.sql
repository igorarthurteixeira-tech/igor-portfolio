-- Playlist do YouTube de cada série (criada pelo painel na primeira publicação da série).
create table if not exists public.serie_youtube (
  slug text primary key,
  playlist_id text not null,
  criado_em timestamptz not null default now()
);

alter table public.serie_youtube enable row level security;
