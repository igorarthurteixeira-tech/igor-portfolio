"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente do navegador, só para login (os dados passam pelas rotas /api/escritorio/*). */
export function clienteEscritorio(): SupabaseClient | null {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_ESCRITORIO_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_ESCRITORIO_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  cliente = createClient(url, key, { auth: { persistSession: true, storageKey: "escritorio-compras-auth" } });
  return cliente;
}
