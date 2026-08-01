/**
 * Identificação da superfície: navegador de desktop, navegador de celular ou
 * WebView dentro do app.
 *
 * Parser puro, sem `next/headers` e sem `window`, porque é chamado dos dois
 * lados: no servidor (rotas que já são dinâmicas) e no cliente (a landing, que
 * é estática e não pode virar dinâmica só para exibir um banner).
 *
 * Isto NÃO é controle de acesso. Sniffing de User-Agent é uma heurística de
 * apresentação — o UA é texto que o cliente escolhe mandar. Quem decide o que
 * cada plataforma pode fazer é a guarda de `record_signal` no banco, contra a
 * plataforma registrada em `devices`.
 */

export type DeviceOS = 'ios' | 'android' | 'other';
export type Surface = 'desktop' | 'mobile-web' | 'in-app';

export type DetectedClient = {
  surface: Surface;
  os: DeviceOS;
  isMobile: boolean;
  /** A página está rodando dentro do WebView do app Sentinela. */
  inApp: boolean;
};

export const DESKTOP: DetectedClient = {
  surface: 'desktop',
  os: 'other',
  isMobile: false,
  inApp: false,
};

const IOS_RE = /iphone|ipod|ipad/i;
const ANDROID_RE = /android/i;
const MOBILE_RE = /android|iphone|ipod|ipad|iemobile|blackberry|opera mini|mobile safari|webos/i;

/**
 * @param userAgent  cabeçalho User-Agent (servidor) ou navigator.userAgent (cliente)
 * @param uaMobile   client hint Sec-CH-UA-Mobile ('?1' / '?0'). Só Chromium manda;
 *                   quando existe, é mais confiável que a regex e vence.
 * @param touchPoints navigator.maxTouchPoints. Só no cliente — é o único jeito de
 *                   pegar iPad moderno, que se anuncia como Safari de Mac.
 */
export function detectClient(
  userAgent: string | null | undefined,
  uaMobile?: string | null,
  touchPoints?: number,
): DetectedClient {
  const ua = userAgent ?? '';
  if (!ua) return DESKTOP;

  const os: DeviceOS = IOS_RE.test(ua)
    ? 'ios'
    : ANDROID_RE.test(ua)
      ? 'android'
      : // iPadOS 13+ manda UA de Safari de Mac. Só o número de pontos de toque
        // separa um iPad de um MacBook, e isso não chega ao servidor.
        /macintosh/i.test(ua) && (touchPoints ?? 0) > 1
        ? 'ios'
        : 'other';

  const hintSaysMobile = uaMobile === '?1';
  const hintSaysDesktop = uaMobile === '?0';

  const isMobile = hintSaysMobile
    ? true
    : hintSaysDesktop
      ? os === 'ios' && (touchPoints ?? 0) > 1
      : MOBILE_RE.test(ua) || (os === 'ios' && (touchPoints ?? 0) > 1);

  // Reservado: quando o app abrir páginas nossas em WebView (checkout, termos),
  // ele deve injetar este token no User-Agent para a web não oferecer instalar
  // um app que já está aberto. Hoje nenhuma tela faz isso — o teste é inócuo e
  // fica no lugar para que a condição já exista quando a primeira aparecer.
  const inApp = /SentinelaApp/i.test(ua);

  return {
    surface: inApp ? 'in-app' : isMobile ? 'mobile-web' : 'desktop',
    os,
    isMobile,
    inApp,
  };
}

/** Loja e deep link. Os IDs de loja só existem depois da primeira submissão. */
export const APP_LINKS = {
  scheme: 'sentinela://',
  package: 'com.sentinela.app',
  ios: process.env.NEXT_PUBLIC_IOS_APP_ID
    ? `https://apps.apple.com/app/id${process.env.NEXT_PUBLIC_IOS_APP_ID}`
    : null,
  android: process.env.NEXT_PUBLIC_ANDROID_PACKAGE
    ? `https://play.google.com/store/apps/details?id=${process.env.NEXT_PUBLIC_ANDROID_PACKAGE}`
    : null,
} as const;

/**
 * URL para abrir o app instalado.
 *
 * No Android não basta `sentinela://`. O Chrome ignora navegação para esquema
 * custom vinda de um `<a href>` — proteção contra sites que sequestram o
 * usuário para outro aplicativo. O caminho suportado é a URL `intent://`, que
 * declara o esquema e o pacote e cai numa alternativa se o app não existir.
 *
 * No iOS o esquema direto funciona; se o app não estiver instalado o Safari
 * apenas mostra um aviso, sem quebrar a página.
 */
export function openAppUrl(os: DeviceOS): string {
  if (os === 'android') {
    const fallback = APP_LINKS.android
      ? `S.browser_fallback_url=${encodeURIComponent(APP_LINKS.android)};`
      : '';
    return `intent://open#Intent;scheme=sentinela;package=${APP_LINKS.package};${fallback}end`;
  }
  return APP_LINKS.scheme;
}

export function storeUrl(os: DeviceOS): string | null {
  if (os === 'ios') return APP_LINKS.ios;
  if (os === 'android') return APP_LINKS.android;
  return null;
}
