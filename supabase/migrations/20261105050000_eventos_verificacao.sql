-- Execute no SQL Editor do Supabase.
-- Estatísticas do portfólio: guarda sinais de que a visita é de uma pessoa de verdade e marca as suspeitas
-- (robôs, prévias de link, testes, saídas imediatas). Nada aqui identifica a pessoa: não se guarda o IP.

alter table public.eventos
  -- "Chrome · Windows · computador"
  add column if not exists aparelho text,
  add column if not exists tela text,
  add column if not exists idioma text,
  add column if not exists fuso text,
  -- país, informado pela hospedagem (sem o IP)
  add column if not exists pais text,
  -- mexeu o mouse, rolou, tocou ou digitou antes de a visita ser registrada
  add column if not exists interagiu boolean,
  add column if not exists tempo_ms integer,
  add column if not exists suspeito boolean not null default false,
  add column if not exists motivo_suspeita text;

create index if not exists eventos_suspeito_idx on public.eventos (suspeito, created_at desc);
