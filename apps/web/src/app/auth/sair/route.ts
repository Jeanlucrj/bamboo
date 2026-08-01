import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Logout.
 *
 * Só POST: um GET seria disparado por qualquer <img src="/auth/sair"> em
 * página de terceiro e derrubaria a sessão do usuário sem que ele pedisse.
 */
export async function POST(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const supabase = await createServerClient();

  // scope 'local' encerra só esta sessão do navegador. 'global' revogaria
  // também o refresh token do celular — e é justamente o aparelho que precisa
  // continuar mandando sinal de vida.
  await supabase.auth.signOut({ scope: 'local' });

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
