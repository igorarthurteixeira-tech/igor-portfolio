-- Meu escritório de compras — projeto Supabase próprio (escritorio-compras).
-- Só o servidor (service role) lê e grava estas tabelas; o navegador usa apenas o login (auth).

-- ---------- preços (compartilhados entre todos os escritórios) ----------
create table if not exists coletas (
  id uuid primary key default gen_random_uuid(),
  origem text not null check (origem in ('agendada', 'manual')),
  fonte text not null,
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table if not exists precos (
  id bigint generated always as identity primary key,
  coleta_id uuid not null references coletas (id) on delete cascade,
  produto_id text not null,
  loja text not null,
  vendedor text,
  preco numeric(12, 2) check (preco > 0),
  disponivel boolean not null default true,
  melhor boolean not null default false,
  url text,
  imagem text,
  coletado_em timestamptz not null
);
create index if not exists precos_melhor on precos (produto_id, coletado_em desc) where melhor;
create index if not exists precos_coleta on precos (coleta_id);

-- ---------- escritórios, funcionários e contratos ----------
create table if not exists escritorios (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null unique references auth.users (id) on delete cascade,
  nome text not null default 'Meu escritório',
  plano text not null default 'gratis' check (plano in ('gratis', 'pago')),
  criado_em timestamptz not null default now()
);

create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete cascade,
  papel text not null check (papel in ('pesquisador', 'analista', 'comprador')),
  nome text not null,
  criado_em timestamptz not null default now()
);
create index if not exists funcionarios_escritorio on funcionarios (escritorio_id);

-- contrato de pesquisa: um pesquisador, um produto, até a data de fim. Não há cancelamento.
create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete cascade,
  funcionario_id uuid not null references funcionarios (id) on delete cascade,
  produto_id text not null,
  inicio timestamptz not null default now(),
  fim timestamptz not null,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);
create index if not exists contratos_ativos on contratos (funcionario_id, fim desc);

-- um pesquisador só pode ter um contrato em andamento
create or replace function contratos_um_por_vez() returns trigger language plpgsql as $$
begin
  if exists (select 1 from contratos where funcionario_id = new.funcionario_id and fim > now() and id <> new.id) then
    raise exception 'Este pesquisador já tem um contrato em andamento.';
  end if;
  if (select papel from funcionarios where id = new.funcionario_id) <> 'pesquisador' then
    raise exception 'Só pesquisadores recebem contratos de pesquisa.';
  end if;
  return new;
end $$;
drop trigger if exists contratos_um_por_vez on contratos;
create trigger contratos_um_por_vez before insert on contratos for each row execute function contratos_um_por_vez();

-- ---------- rodadas e diário (por escritório) ----------
create table if not exists rodadas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete cascade,
  coleta_id uuid references coletas (id) on delete set null,
  origem text not null check (origem in ('agendada', 'manual')),
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz
);
create index if not exists rodadas_escritorio on rodadas (escritorio_id, iniciada_em desc);

create table if not exists eventos (
  id bigint generated always as identity primary key,
  rodada_id uuid not null references rodadas (id) on delete cascade,
  ordem int not null,
  criado_em timestamptz not null,
  agente text not null check (agente in ('pesquisador', 'analista', 'comprador')),
  funcionario_id uuid references funcionarios (id) on delete set null,
  tipo text not null,
  produto_id text,
  dados jsonb not null default '{}'::jsonb
);
create index if not exists eventos_rodada on eventos (rodada_id, ordem);

-- ---------- escritório grátis criado no cadastro ----------
create or replace function public.criar_escritorio_gratis() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  novo uuid;
begin
  insert into escritorios (dono) values (new.id) returning id into novo;
  insert into funcionarios (escritorio_id, papel, nome) values
    (novo, 'pesquisador', 'Pesquisador'),
    (novo, 'analista', 'Analista'),
    (novo, 'comprador', 'Comprador');
  return new;
end $$;
drop trigger if exists criar_escritorio_gratis on auth.users;
create trigger criar_escritorio_gratis after insert on auth.users for each row execute function public.criar_escritorio_gratis();

-- ---------- acesso: só o servidor ----------
alter table coletas enable row level security;
alter table precos enable row level security;
alter table escritorios enable row level security;
alter table funcionarios enable row level security;
alter table contratos enable row level security;
alter table rodadas enable row level security;
alter table eventos enable row level security;
