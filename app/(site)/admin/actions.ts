"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminUser, supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loginBloqueado, loginDeuCerto, loginFalhou } from "@/lib/limite-tentativas";

export async function entrar(
  _estado: { erro?: string },
  formData: FormData,
): Promise<{ erro?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { erro: "Supabase não configurado." };

  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  // excesso de tentativas: bloqueia antes mesmo de conferir a senha
  const bloqueio = await loginBloqueado(email);
  if (bloqueio) return { erro: bloqueio };
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { erro: await loginFalhou(email) };
  await loginDeuCerto(email);

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
  revalidatePath("/admin", "layout");
}

export async function excluirMensagem(id: string) {
  if (!(await getAdminUser())) return;
  await supabaseAdmin()?.from("mensagens").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function moderarComentario(id: string, aprovado: boolean) {
  if (!(await getAdminUser())) return;
  await supabaseAdmin()?.from("serie_comentarios").update({ aprovado }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function excluirComentario(id: string) {
  if (!(await getAdminUser())) return;
  await supabaseAdmin()?.from("serie_comentarios").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}
