-- Execute no SQL Editor do Supabase.
-- "Tipo de vídeo" vira "Tipo de pedido": o pedido pode ser um vídeo, um carrossel, uma imagem...
-- O assunto do vídeo (recap, institucional...) passa a ir no título e na descrição do pedido.

insert into public.etm_tipos (rotulo, descricao, criado_em) values
  ('Vídeo', 'Vídeo editado a partir de fotos, imagens e gravações. Ex.: recap de evento, institucional, depoimento.', now()),
  ('Carrossel', 'Sequência de imagens para deslizar nas redes sociais, com uma ideia por imagem.', now() + interval '1 second'),
  ('Imagem / arte', 'Uma peça gráfica única: post, capa, banner ou convite.', now() + interval '2 seconds')
on conflict (rotulo) do nothing;

update public.etm_pedidos set tipo = case tipo
  when 'Vídeo-carrossel de fotos' then 'Carrossel'
  when 'Recap de evento' then 'Vídeo'
  when 'Institucional' then 'Vídeo'
  when 'Depoimento / entrevista' then 'Vídeo'
  else tipo
end;

delete from public.etm_tipos
where rotulo in ('Recap de evento', 'Vídeo-carrossel de fotos', 'Institucional', 'Depoimento / entrevista');

update public.etm_tipos
set descricao = 'Qualquer pedido que não se encaixe nos tipos acima. Explique o que precisa na descrição do pedido.'
where rotulo = 'Outro';
