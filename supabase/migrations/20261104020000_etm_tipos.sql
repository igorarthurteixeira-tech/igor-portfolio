-- Execute no SQL Editor do Supabase.
-- Tipos de vídeo editáveis: a ETM pode criar tipos novos no próprio pedido; o painel pode ocultar.
-- O pedido guarda o nome do tipo por extenso, então renomear ou ocultar não quebra pedidos antigos.

create table if not exists public.etm_tipos (
  rotulo text primary key,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.etm_tipos enable row level security;

insert into public.etm_tipos (rotulo) values
  ('Recap de evento'),
  ('Vídeo-carrossel de fotos'),
  ('Institucional'),
  ('Depoimento / entrevista'),
  ('Outro')
on conflict (rotulo) do nothing;

-- pedidos antigos guardavam um código (recap, carrossel...): passam a guardar o nome
update public.etm_pedidos set tipo = case tipo
  when 'recap' then 'Recap de evento'
  when 'carrossel' then 'Vídeo-carrossel de fotos'
  when 'institucional' then 'Institucional'
  when 'depoimento' then 'Depoimento / entrevista'
  when 'outro' then 'Outro'
  else tipo
end;

alter table public.etm_pedidos alter column tipo set default 'Outro';
