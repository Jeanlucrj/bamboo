import type { NextRequest } from 'next/server';

/**
 * Origem para onde devolver o usuário depois de autenticar.
 *
 * Precisa ser o host de onde ele VEIO, nunca um valor fixo de ambiente. Uma
 * versão anterior usava `NEXT_PUBLIC_SITE_URL` aqui, e o resultado aparecia no
 * primeiro teste em aparelho real: o celular abria o app em
 * `http://192.168.0.15:3002`, pedia o link mágico, clicava — e o callback o
 * mandava para `http://localhost:3002/dashboard`. No celular, `localhost` é o
 * próprio celular. Sessão criada, usuário numa tela de erro.
 *
 * `x-forwarded-host` vem antes porque atrás de proxy (Vercel, nginx) o
 * `nextUrl.origin` é o endereço interno do container, não o domínio público.
 *
 * Sobre confiar no header: o risco teórico é um Host forjado levar o redirect
 * para outro domínio. O cookie de sessão não vaza — ele é gravado para o
 * domínio real na resposta, e o destino do redirect não o carrega. Se um dia
 * este app rodar em plataforma que não normaliza o header, troque por uma
 * lista de hosts permitidos.
 */
export function resolveOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    return `${proto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}
