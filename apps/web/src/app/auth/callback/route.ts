import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/nextPath';
import { resolveOrigin } from '@/lib/auth/origin';

/**
 * Destino do link mágico e do OAuth.
 *
 * A troca do código pela sessão precisa acontecer em Route Handler, não em
 * Server Component: só aqui o `cookies()` do Next aceita escrita, e é a
 * escrita do cookie que materializa a sessão. Num Server Component o
 * `setAll` do client cai no catch e o usuário volta para /login em loop.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Do host de onde o usuário veio — nunca de NEXT_PUBLIC_SITE_URL. Ver o
  // comentário em lib/auth/origin.ts: fixar isso mandava quem entrou pelo IP
  // da rede local direto para uma tela de erro.
  const origin = resolveOrigin(request);
  const next = safeNextPath(searchParams.get('next'));

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?erro=${reason}&next=${encodeURIComponent(next)}`);

  // O Supabase devolve o erro na própria querystring quando o link já foi
  // usado ou passou da validade.
  const providerError = searchParams.get('error') ?? searchParams.get('error_description');
  if (providerError) {
    return fail(/expired|invalid/i.test(providerError) ? 'link_expirado' : 'falha');
  }

  const supabase = await createServerClient();

  // Fluxo PKCE (padrão do @supabase/ssr): o link volta com ?code=.
  const code = searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail('link_expirado');
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Fallback para templates de e-mail que usam {{ .TokenHash }} em vez de
  // {{ .ConfirmationURL }} — verificação de e-mail e convite B2B caem aqui.
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail('link_expirado');
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Sem `code` e sem `token_hash` a sessão pode estar no FRAGMENTO da URL
  // (fluxo implícito), que nunca chega ao servidor. Antes de declarar o link
  // inválido, passa a bola para uma página cliente que consegue ler o
  // fragmento. O redirect preserva o `#...` porque o destino não tem um
  // próprio — e se lá também não houver nada, ela cai no erro de verdade.
  return NextResponse.redirect(
    `${origin}/auth/finalizar?next=${encodeURIComponent(next)}`,
  );
}
