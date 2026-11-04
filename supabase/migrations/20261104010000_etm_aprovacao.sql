-- Execute no SQL Editor do Supabase.
-- Cadastro feito pela própria pessoa da ETM; o acesso só vale depois que o painel aprova.

alter table public.etm_usuarios
  add column if not exists situacao text not null default 'pendente'
  check (situacao in ('pendente', 'aprovado', 'bloqueado'));

update public.etm_usuarios set situacao = case when ativo then 'aprovado' else 'bloqueado' end;

alter table public.etm_usuarios drop column if exists ativo;
