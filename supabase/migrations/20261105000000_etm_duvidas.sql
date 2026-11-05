-- Execute no SQL Editor do Supabase.
-- Dúvidas: quem produz pergunta à ETM ("duvida") e a ETM responde ("resposta"), a resposta apontando para a pergunta.
-- Enquanto não houver resposta apontando para ela, a pergunta está em aberto e aparece em destaque para a ETM.

alter table public.etm_eventos
  add column if not exists responde_a uuid references public.etm_eventos (id) on delete cascade;

alter table public.etm_eventos drop constraint if exists etm_eventos_tipo_check;
alter table public.etm_eventos
  add constraint etm_eventos_tipo_check
  check (tipo in ('criado', 'comentario', 'status', 'entrega', 'correcao', 'aprovacao', 'duvida', 'resposta'));

create index if not exists etm_eventos_responde_idx on public.etm_eventos (responde_a) where responde_a is not null;
