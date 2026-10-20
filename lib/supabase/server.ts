import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente ligado à sessão (cookies) de quem está logado. */
export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // chamado de Server Component: o proxy já renova a sessão
        }
      },
    },
  });
}

/** Retorna o usuário se for o admin autorizado; senão null. */
export async function getAdminUser() {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const permitido = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!permitido || user.email?.toLowerCase() !== permitido) return null;
  return user;
}
