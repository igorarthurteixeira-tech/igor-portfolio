import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** O showroom de demonstração fica oculto no site publicado até a chave ser ligada. */
const SHOWROOM_LIGADO = process.env.NEXT_PUBLIC_SHOWROOM === "1";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/showroom" || pathname.startsWith("/showroom/")) {
    return SHOWROOM_LIGADO
      ? NextResponse.next()
      : NextResponse.rewrite(new URL("/_oculto", request.url), { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const ehLogin = pathname === "/admin/login";

  if (!url || !key) {
    return ehLogin ? NextResponse.next() : redirecionarLogin(request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const permitido = process.env.ADMIN_EMAIL?.toLowerCase();
  const autorizado =
    !!data.user && !!permitido && data.user.email?.toLowerCase() === permitido;

  if (!autorizado && !ehLogin) return redirecionarLogin(request);
  if (autorizado && ehLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return response;
}

function redirecionarLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = { matcher: ["/admin/:path*", "/showroom", "/showroom/:path*"] };
