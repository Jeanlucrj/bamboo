'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Mantém a web em dia com o que acontece no app.
 *
 * As páginas do painel são `force-dynamic`, então mostram dado fresco a cada
 * navegação — mas uma aba deixada aberta congelava. Encerrar a viagem no
 * celular e olhar o navegador mostrava a viagem ainda ativa, com o cronômetro
 * correndo, até alguém apertar F5.
 *
 * BROADCAST em canal privado, não `postgres_changes`. Este projeto tem o
 * `postgres_changes` mudo: com a tabela publicada, RLS correta e slot de
 * replicação ativo, o canal responde SUBSCRIBED e nenhum evento chega — mas um
 * broadcast no mesmo canal volta na hora. Quem emite agora é um gatilho no
 * banco, pelo caminho que funciona.
 *
 * `router.refresh()` e não `location.reload()`: refaz só a árvore de Server
 * Components e costura no DOM existente. O scroll fica onde estava, formulário
 * pela metade não se perde, e a página não pisca.
 */
export function SincronizaViagens() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    let canal: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // O tópico carrega o uuid do dono, então precisamos dele antes de entrar.
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;

      canal = supabase
        .channel(`viagens:${uid}`, { config: { private: true } })
        .on('broadcast', { event: 'INSERT' }, () => router.refresh())
        .on('broadcast', { event: 'UPDATE' }, () => router.refresh())
        .on('broadcast', { event: 'DELETE' }, () => router.refresh())
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[sentinela] canal de viagens não autorizado:', status);
          }
        });
    })();

    return () => {
      if (canal) supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}
