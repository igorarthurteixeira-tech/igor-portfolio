-- Execute no SQL Editor do Supabase.
-- Comentários marcados num segundo de um vídeo entregue (como os comentários com tempo do YouTube),
-- usados para pedir correções. Ao pedir a correção, os comentários pendentes ficam ligados a ela.

create table if not exists public.etm_comentarios_video (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.etm_pedidos (id) on delete cascade,
  arquivo_id uuid not null references public.etm_arquivos (id) on delete cascade,
  segundo numeric(8, 1) not null check (segundo >= 0),
  texto text not null,
  autor_nome text not null,
  autor_id uuid,
  -- quem produz marca como feito depois de corrigir aquele ponto
  feito boolean not null default false,
  -- preenchido quando o pedido de correção é enviado; antes disso o comentário ainda é um rascunho de correção
  correcao_evento_id uuid references public.etm_eventos (id) on delete set null,
  criado_em timestamptz not null default now(),
  editado_em timestamptz
);

create index if not exists etm_comentarios_video_arquivo_idx on public.etm_comentarios_video (arquivo_id, segundo);
create index if not exists etm_comentarios_video_pedido_idx on public.etm_comentarios_video (pedido_id);

-- Tudo passa pelas rotas do servidor. Sem policies = ninguém acessa direto pelo navegador.
alter table public.etm_comentarios_video enable row level security;
