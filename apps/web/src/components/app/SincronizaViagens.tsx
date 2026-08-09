'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Mantém a web em dia com o que acontece no app.
 *
 * O app sempre teve inscrição de tempo real em `travel_sessions`; a web, não.
 * Como as páginas do painel são `force-dynamic`, elas mostram dado fresco a
 * cada navegação — mas uma aba deixada aberta congelava. Encerrar a viagem no
 * celular e olhar o navegador mostrava a viagem ainda ativa, com o cronômetro
 * correndo, até alguém apertar F5.
 *
 * `router.refresh()` e não `window.location.reload()`: ele refaz só a árvore
 * de Server Components e costura o resultado no DOM existente. O scroll fica
 * onde estava, formulários pela metade não se perdem, e a página não pisca.
 *
 * Sem filtro por usuário na inscrição porque a RLS já faz isso do lado do
 * servidor: o Realtime avalia as políticas antes de entregar, então só chega
 * evento das viagens de quem está logado.
 */
export function SincronizaViagens() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();

    const canal = supabase
      .channel('web:travel_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'travel_sessions' },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}
