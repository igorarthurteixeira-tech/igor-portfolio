"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminUser, supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function entrar(
  _estado: { erro?: string },
  formData: FormData,
): Promise<{ erro?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { erro: "Supabase não configurado." };

  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { erro: "E-mail ou senha incorretos." };

  if (!(await getAdminUser())) {
    await supabase.auth.signOut();
    return { erro: "Esta conta não tem acesso ao painel." };
  }
  redirect("/admin");
}

export async function sair() {
  const supabase = await supabaseServer();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

export async function alternarLida(id: string, lida: boolean) {
  if (!(await getAdminUser())) return;
  await supabaseAdmin()?.from("mensagens").update({ lida }).eq("id", id);
  revalidatePath("/admin");
}

export async function excluirMensagem(id: string) {
  if (!(await getAdminUser())) return;
  await supabaseAdmin()?.from("mensagens").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function moderarComentario(id: string, aprovado: boolean) {
  if (!(await getAdminUser())) return;
  await supabaseAdmin()?.from("serie_comentarios").update({ aprovado }).eq("id", id);
  revalidatePath("/admin");
}

export async function excluirComentario(id: string) {
  if (!(await getAdminUser())) return;
  await supabaseAdmin()?.from("serie_comentarios").delete().eq("id", id);
  revalidatePath("/admin");
}
