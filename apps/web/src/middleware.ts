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
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => path.startsWith(p));
  const isGuestOnly = GUEST_ONLY.some((p) => path === p);

  // 1. Resposta instantânea para páginas públicas (marketing, dossiê, etc.)
  // Não faz nenhuma chamada externa de rede para autenticação em rotas públicas!
  if (!isProtected && !isGuestOnly) {
    return response;
  }

  // 2. Checagem rápida de cookies Supabase antes de ir à rede
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some((c) => c.name.startsWith('sb-') || c.name.includes('auth-token'));

  let user = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isPlaceholderUrl = !supabaseUrl || supabaseUrl.includes('placeholder');

  // Só consulta o Supabase se houver cookie de autenticação e URL válida do Supabase
  if (hasAuthCookie && !isPlaceholderUrl) {
    try {
      const supabase = createServerClient<Database>(
        supabaseUrl,
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

      // Timeout de 2 segundos para evitar que latência/falhas de rede travem a navegação
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 2000),
      );

      const { data } = await Promise.race([userPromise, timeoutPromise]);
      user = data?.user ?? null;
    } catch {
      user = null;
    }
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && isGuestOnly) {
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
