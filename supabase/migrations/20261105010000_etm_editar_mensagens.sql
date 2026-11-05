-- Execute no SQL Editor do Supabase.
-- Editar e excluir mensagens, perguntas e respostas: guarda quem escreveu e quando foi editada.

alter table public.etm_eventos
  add column if not exists autor_id uuid,
  add column if not exists editado_em timestamptz;
