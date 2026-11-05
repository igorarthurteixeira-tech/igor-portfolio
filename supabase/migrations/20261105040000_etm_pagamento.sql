-- Execute no SQL Editor do Supabase.
-- Pagamento da cobrança, marcado à mão por quem produz. Com cobrança, o download do vídeo final
-- só é liberado depois do pagamento marcado (e do pedido aprovado).

alter table public.etm_pedidos add column if not exists cobranca_paga_em timestamptz;

alter table public.etm_eventos drop constraint if exists etm_eventos_tipo_check;
alter table public.etm_eventos
  add constraint etm_eventos_tipo_check
  check (tipo in ('criado', 'comentario', 'status', 'entrega', 'correcao', 'aprovacao', 'duvida', 'resposta', 'cobranca', 'aceite', 'recusa', 'pagamento'));
