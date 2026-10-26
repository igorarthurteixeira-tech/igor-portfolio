-- Execute no SQL Editor do Supabase.
-- Publicações em carrossel (várias imagens): Instagram e a página "Conteúdos" do site.

alter table public.publicacoes
  add column if not exists tipo text not null default 'video',
  -- endereços públicos das imagens, na ordem dos slides
  add column if not exists imagens text[] not null default '{}',
  -- endereço da página no site: /conteudos/<slug>
  add column if not exists slug text,
  add column if not exists no_site boolean not null default false;

alter table public.publicacoes drop constraint if exists publicacoes_tipo_check;
alter table public.publicacoes
  add constraint publicacoes_tipo_check check (tipo in ('video', 'carrossel'));

create unique index if not exists publicacoes_slug_idx on public.publicacoes (slug) where slug is not null;
