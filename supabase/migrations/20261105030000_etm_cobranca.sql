-- Execute no SQL Editor do Supabase.
-- Cobrança por pedido: antes de iniciar a produção, quem produz marca que o vídeo gera cobrança e informa o valor;
-- o cliente precisa aceitar. A cobrança só é feita ao final do vídeo. O aceite fica registrado (quem, quando e quanto).

alter table public.etm_pedidos
  add column if not exists valor_cobranca numeric(12, 2),
  add column if not exists cobranca_status text not null default 'nenhuma',
  add column if not exists cobranca_aceita_em timestamptz,
  add column if not exists cobranca_aceita_por text;

alter table public.etm_pedidos drop constraint if exists etm_pedidos_cobranca_status_check;
alter table public.etm_pedidos
  add constraint etm_pedidos_cobranca_status_check
  check (cobranca_status in ('nenhuma', 'proposta', 'aceita', 'recusada'));

-- novo status: o pedido espera o aceite da cobrança antes de a produção começar
alter table public.etm_pedidos drop constraint if exists etm_pedidos_status_check;
alter table public.etm_pedidos
  add constraint etm_pedidos_status_check
  check (status in ('recebido', 'aguardando_aceite', 'em_producao', 'em_avaliacao', 'correcao', 'aprovado', 'enviado', 'cancelado'));

-- eventos da cobrança na linha do tempo, com o valor
alter table public.etm_eventos add column if not exists valor numeric(12, 2);

alter table public.etm_eventos drop constraint if exists etm_eventos_tipo_check;
alter table public.etm_eventos
  add constraint etm_eventos_tipo_check
  check (tipo in ('criado', 'comentario', 'status', 'entrega', 'correcao', 'aprovacao', 'duvida', 'resposta', 'cobranca', 'aceite', 'recusa'));
