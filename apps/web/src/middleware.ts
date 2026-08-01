import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@sentinela/shared';
import { safeNextPath, DEFAULT_AFTER_LOGIN } from '@/lib/auth/nextPath';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PROTECTED = [
  '/dashboard', '/viagens', '/diario', '/analytics', '/contatos', '/integracoes', '/conta',
  '/admin',
];

/** Páginas que só fazem sentido deslogado. */
const GUEST_ONLY = ['/login', '/cadastro'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  let user = null;

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(items: CookieToSet[]) {
            items.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (err) {
    // Se o Supabase estiver indisponível ou houver falha de rede/credencial,
    // o middleware não deve quebrar com Internal Server Error (500).
    user = null;
  }

  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && GUEST_ONLY.some((p) => path === p)) {
    const url = request.nextUrl.clone();
    const target = safeNextPath(request.nextUrl.searchParams.get('next'));
    url.pathname = target.split('?')[0];
    url.search = target.includes('?') ? target.slice(target.indexOf('?')) : '';
    if (GUEST_ONLY.includes(url.pathname)) url.pathname = DEFAULT_AFTER_LOGIN;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|d/|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
