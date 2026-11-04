-- Execute no SQL Editor do Supabase.
-- Descrição dos tipos de vídeo: explica para que serve cada tipo (aparece no formulário do pedido).

alter table public.etm_tipos add column if not exists descricao text not null default '';

update public.etm_tipos set descricao = case rotulo
  when 'Recap de evento' then 'Resumo em vídeo de um evento, com fotos, trechos gravados e depoimentos. Ex.: workshop, simpósio, feira.'
  when 'Vídeo-carrossel de fotos' then 'Sequência de fotos com frases curtas e transições, no formato de carrossel para redes sociais.'
  when 'Institucional' then 'Apresenta a empresa, as áreas de atuação e os diferenciais. Serve para feiras, site e propostas.'
  when 'Depoimento / entrevista' then 'Corte de uma fala ou entrevista, com legendas, em versão curta para publicar.'
  when 'Outro' then 'Qualquer vídeo que não se encaixe nos tipos acima. Explique o que precisa na descrição do pedido.'
  else descricao
end
where descricao = '';
