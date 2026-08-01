'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { detectClient, storeUrl, openAppUrl, type DetectedClient } from '@/lib/device/detect';

const DISMISS_KEY = 'sentinela:handoff-dismissed';

/**
 * Faixa que aparece quando o site é aberto no navegador do celular.
 *
 * Existe porque a web não consegue entregar o produto: sem execução em
 * background, sem GPS com a tela bloqueada e sem notificação crítica, um
 * Dead Man's Switch no navegador é uma promessa que não se cumpre. Melhor
 * dizer isso do que deixar a pessoa achar que está protegida.
 *
 * Detecta no cliente, não no servidor, para não tirar a landing do cache
 * estático. O custo é o banner entrar um frame depois da pintura — aceitável
 * para um aviso; seria inaceitável para conteúdo principal.
 */
export function AppHandoff() {
  const pathname = usePathname();
  const [client, setClient] = useState<DetectedClient | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setClient(
      detectClient(navigator.userAgent, null, navigator.maxTouchPoints),
    );
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      // Safari em navegação privada lança ao tocar no localStorage.
      setDismissed(false);
    }
  }, []);

  // O dossiê é aberto por um contato de emergência, muitas vezes no celular
  // dele, durante um incidente. Vender instalação de app nessa tela é a pior
  // coisa que este componente poderia fazer.
  const isDossier = pathname?.startsWith('/d/') ?? false;

  if (!client || dismissed || isDossier) return null;
  if (client.surface !== 'mobile-web') return null;

  const store = storeUrl(client.os);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sessão privada: some só nesta navegação */
    }
  }

  return (
    <div className="border-b border-teal-900/60 bg-teal-950/70 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-teal-100">
            O monitoramento roda no app, não aqui
          </p>
          <p className="mt-1 text-xs leading-relaxed text-teal-200/80">
            Check-in automático, SOS e alerta de emergência precisam do GPS em segundo plano — o
            navegador não executa com a tela bloqueada. Pelo site você resolve conta, contatos e
            assinatura.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={openAppUrl(client.os)}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Abrir o app
            </a>
            {store && (
              <a
                href={store}
                className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-200"
              >
                Instalar
              </a>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso"
          className="shrink-0 rounded p-1 text-teal-400 transition hover:text-teal-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
