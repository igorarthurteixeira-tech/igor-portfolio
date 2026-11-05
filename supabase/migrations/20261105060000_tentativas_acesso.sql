-- Execute no SQL Editor do Supabase.
-- Limite de tentativas de entrada (senha errada) e de criação de contas, que vale em todas as instâncias do servidor.
-- Guarda só um resumo irreversível do IP e do e-mail (nunca o valor), e as tentativas velhas são apagadas sozinhas.

create table if not exists public.tentativas_acesso (
  id bigint generated always as identity primary key,
  -- "login" ou "cadastro"
  tipo text not null,
  -- "ip:<resumo>", "email:<resumo>" ou "global"
  chave text not null,
  criado_em timestamptz not null default now()
);

create index if not exists tentativas_acesso_busca_idx on public.tentativas_acesso (tipo, chave, criado_em desc);

-- Só o servidor acessa (service role); sem policies, ninguém lê pelo navegador.
alter table public.tentativas_acesso enable row level security;
