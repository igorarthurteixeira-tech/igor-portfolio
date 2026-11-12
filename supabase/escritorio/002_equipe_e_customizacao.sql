-- Equipe maior e customização do escritório.
-- config: cores, itens decorativos e uniformes (só o plano pago edita).
alter table escritorios add column if not exists config jsonb not null default '{}'::jsonb;

-- um mesmo produto não fica com dois pesquisadores do mesmo escritório ao mesmo tempo
create or replace function contratos_um_por_vez() returns trigger language plpgsql as $$
begin
  if exists (select 1 from contratos where funcionario_id = new.funcionario_id and fim > now() and id <> new.id) then
    raise exception 'Este pesquisador já tem um contrato em andamento.';
  end if;
  if exists (select 1 from contratos where escritorio_id = new.escritorio_id and produto_id = new.produto_id and fim > now() and id <> new.id) then
    raise exception 'Outro pesquisador do escritório já acompanha este produto.';
  end if;
  if (select papel from funcionarios where id = new.funcionario_id) <> 'pesquisador' then
    raise exception 'Só pesquisadores recebem contratos de pesquisa.';
  end if;
  return new;
end $$;
