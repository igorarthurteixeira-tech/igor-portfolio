-- Texto de agenda por série (ex.: "Episódios todos os dias às 12h"), editado no painel
-- e exibido no site.
create table if not exists public.serie_config (
  slug text primary key,
  agenda text not null,
  atualizado_em timestamptz not null default now()
);

-- Tudo passa pelas rotas do servidor (service role).
alter table public.serie_config enable row level security;
