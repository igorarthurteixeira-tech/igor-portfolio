-- Liga uma publicação a um episódio da série (ex.: 'expediente:1'),
-- para o site exibir o vídeo do YouTube enviado pelo painel.
alter table public.publicacoes
  add column if not exists episodio text;
