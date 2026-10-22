-- Execute no SQL Editor do Supabase.
-- Curtidas e comentários dos episódios da série "Vida de Dono".

create table if not exists public.serie_curtidas (
  id bigint generated always as identity primary key,
  episodio text not null,
  sessao text not null,
  created_at timestamptz not null default now(),
  unique (episodio, sessao)
);

create table if not exists public.serie_comentarios (
  id uuid primary key default gen_random_uuid(),
  episodio text not null,
  nome text not null,
  texto text not null,
  aprovado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists serie_curtidas_episodio_idx on public.serie_curtidas (episodio);
create index if not exists serie_comentarios_episodio_idx on public.serie_comentarios (episodio, aprovado, created_at desc);

-- Tudo passa pelas rotas do servidor (service role). Sem policies = ninguém
-- acessa as tabelas direto pelo navegador.
alter table public.serie_curtidas enable row level security;
alter table public.serie_comentarios enable row level security;
