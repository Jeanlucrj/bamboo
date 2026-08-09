'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { safeNextPath } from '@/lib/auth/nextPath';

/**
 * Resgate do fluxo implícito.
 *
 * O `/auth/callback` é um route handler e só enxerga a query string. Quando o
 * pedido de link não usou PKCE, o GoTrue devolve a sessão no FRAGMENTO da URL
 * (`#access_token=...`) — e fragmento o navegador jamais envia ao servidor. Do
 * ponto de vista do handler chegou um callback vazio, e o usuário via
 * "link inválido" com o token dele ali, na barra de endereço, invisível.
 *
 * Esta página existe para esse caso: roda no cliente, lê o fragmento, grava a
 * sessão em cookie e segue. O redirect do handler para cá preserva o fragmento
 * porque o destino não tem um próprio.
 *
 * Não é o caminho principal — o formulário de login usa PKCE e cai no `?code=`.
 * É a rede de proteção para link pedido fora do app, sessão trocada de
 * navegador ou template de e-mail que ainda aponte para o fluxo antigo.
 */
export default function FinalizarLogin() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const next = safeNextPath(query.get('next'));

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const hashError = hash.get('error_description') ?? hash.get('error');

    if (hashError) {
      router.replace(
        `/login?erro=${/expired|invalid/i.test(hashError) ? 'link_expirado' : 'falha'}`,
      );
      return;
    }

    if (!accessToken || !refreshToken) {
      router.replace('/login?erro=link_invalido');
      return;
    }

    createBrowserClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setErro(error.message);
          return;
        }
        // Limpa o fragmento antes de sair: o access_token ficaria no histórico
        // do navegador e no Referer de qualquer link clicado em seguida.
        window.location.replace(next);
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="text-center">
        {erro ? (
          <>
            <p className="text-sm font-semibold text-red-400">Não foi possível entrar</p>
            <p className="mt-2 text-sm text-slate-400">{erro}</p>
            <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-teal-400">
              Pedir um novo link
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-400">Entrando…</p>
        )}
      </div>
    </div>
  );
}
