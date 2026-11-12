-- Catálogo de produtos no banco: o próprio usuário encontra produtos pela busca nas lojas e escolhe
-- quais acompanhar. O catálogo é compartilhado: se duas pessoas escolhem o mesmo produto, é a mesma
-- linha (e as coletas são reaproveitadas). Só o servidor (service role) lê e grava.

create table if not exists produtos (
  id text primary key,
  nome text not null,
  categoria text not null,
  marca text not null default '',
  modelo text not null default '',
  destaques jsonb not null default '[]',
  -- ofertas: páginas de lojas reais que o pesquisador visita a cada rodada
  ofertas jsonb not null check (jsonb_typeof(ofertas) = 'array' and jsonb_array_length(ofertas) between 1 and 12),
  ean text,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);
create unique index if not exists produtos_ean on produtos (ean) where ean is not null;
create index if not exists produtos_ofertas on produtos using gin (ofertas jsonb_path_ops);
alter table produtos enable row level security;

-- os 6 produtos que já existiam no código (mesmos ids: o histórico de preços continua valendo)
insert into produtos (id, nome, categoria, marca, modelo, destaques, ofertas) values
  ('tcl-55c6k', 'TV TCL 55" QD-Mini LED 4K C6K', 'Televisor', 'TCL', '55C6K',
    '["55 polegadas, 4K UHD", "Tela QD-Mini LED", "Google TV", "HDR10+ e HLG", "4 entradas HDMI, Wi-Fi e Bluetooth"]',
    '[{"loja": "KaBuM", "tipo": "kabum", "codigo": "911482"}, {"loja": "KaBuM", "tipo": "kabum", "codigo": "938048"}]'),
  ('tcl-55t6c', 'TV TCL 55" QLED 4K T6C', 'Televisor', 'TCL', '55T6C',
    '["55 polegadas, 4K UHD", "Tela QLED HVA", "Google TV", "HDR10+", "Wi-Fi e Bluetooth"]',
    '[{"loja": "KaBuM", "tipo": "kabum", "codigo": "1048036"}, {"loja": "KaBuM", "tipo": "kabum", "codigo": "1060902"}]'),
  ('samsung-55m75h', 'TV Samsung 55" Mini LED 4K M75H', 'Televisor', 'Samsung', 'UN55M75HAGXZD',
    '["55 polegadas, 4K", "Tela Mini LED", "Vision AI"]',
    '[{"loja": "KaBuM", "tipo": "kabum", "codigo": "1070627"}]'),
  ('consul-crm44mb', 'Geladeira Consul Frost Free Duplex 377 L', 'Geladeira', 'Consul', 'CRM44MB',
    '["377 litros, duas portas (duplex)", "Frost Free", "Tecnologia Inverter", "Selo de eficiência A", "Cor branca"]',
    '[{"loja": "Consul", "tipo": "vtex", "base": "https://www.consul.com.br", "ref": "CRM44MB"}]'),
  ('brastemp-brm44hb', 'Geladeira Brastemp Frost Free Duplex 375 L', 'Geladeira', 'Brastemp', 'BRM44HB',
    '["375 litros, duas portas (duplex)", "Frost Free", "Cor branca"]',
    '[{"loja": "Brastemp", "tipo": "vtex", "base": "https://www.brastemp.com.br", "ref": "BRM44HB"}]'),
  ('brastemp-brm51mb', 'Geladeira Brastemp Frost Free Duplex 415 L', 'Geladeira', 'Brastemp', 'BRM51MB',
    '["415 litros, duas portas (duplex)", "Frost Free", "Cor branca"]',
    '[{"loja": "Brastemp", "tipo": "vtex", "base": "https://www.brastemp.com.br", "ref": "BRM51MB"}]')
on conflict (id) do nothing;
