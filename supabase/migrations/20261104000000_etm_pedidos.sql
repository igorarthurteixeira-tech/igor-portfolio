-- Execute no SQL Editor do Supabase.
-- Pedidos de vídeo da ETM: pedido, produção, avaliação, correções, aprovação e envio.

-- Pessoas da ETM com acesso (contas criadas pelo painel, em Supabase Auth).
create table if not exists public.etm_usuarios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.etm_pedidos (
  id uuid primary key,
  numero bigint generated always as identity,
  solicitante_id uuid references auth.users (id) on delete set null,
  solicitante_nome text not null,
  titulo text not null,
  tipo text not null default 'outro',
  descricao text not null default '',
  prazo date,
  urgente boolean not null default false,
  link_material text,
  status text not null default 'recebido'
    check (status in ('recebido', 'em_producao', 'em_avaliacao', 'correcao', 'aprovado', 'enviado', 'cancelado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Linha do tempo do pedido: comentários, entregas (versões), correções, mudanças de status.
create table if not exists public.etm_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.etm_pedidos (id) on delete cascade,
  autor text not null check (autor in ('etm', 'igor')),
  autor_nome text not null,
  tipo text not null check (tipo in ('criado', 'comentario', 'status', 'entrega', 'correcao', 'aprovacao')),
  texto text not null default '',
  status_novo text,
  versao int,
  link text,
  criado_em timestamptz not null default now()
);

create table if not exists public.etm_arquivos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.etm_pedidos (id) on delete cascade,
  evento_id uuid references public.etm_eventos (id) on delete cascade,
  papel text not null check (papel in ('material', 'entrega', 'anexo')),
  caminho text not null,
  nome text not null,
  tamanho bigint not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists etm_pedidos_status_idx on public.etm_pedidos (status, atualizado_em desc);
create index if not exists etm_eventos_pedido_idx on public.etm_eventos (pedido_id, criado_em);
create index if not exists etm_arquivos_pedido_idx on public.etm_arquivos (pedido_id);

-- Tudo passa pelas rotas do servidor (service role). Sem policies = ninguém
-- acessa as tabelas direto pelo navegador, nem logado.
alter table public.etm_usuarios enable row level security;
alter table public.etm_pedidos enable row level security;
alter table public.etm_eventos enable row level security;
alter table public.etm_arquivos enable row level security;

-- Arquivos (material enviado e vídeos entregues). Privado: só links assinados.
insert into storage.buckets (id, name, public, file_size_limit)
values ('etm', 'etm', false, 52428800)
on conflict (id) do nothing;
