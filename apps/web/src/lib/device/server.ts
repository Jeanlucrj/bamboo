import { headers } from 'next/headers';
import { detectClient, type DetectedClient } from './detect';

/**
 * Detecção no servidor.
 *
 * Só use em rota que JÁ é dinâmica. `headers()` opta a rota inteira para
 * render sob demanda — chamar isto no layout de marketing tiraria a landing do
 * cache estático para exibir um banner, o que é um péssimo negócio. Lá o
 * componente cliente `<AppHandoff />` faz o mesmo trabalho.
 */
export async function getClient(): Promise<DetectedClient> {
  const h = await headers();
  return detectClient(h.get('user-agent'), h.get('sec-ch-ua-mobile'));
}
