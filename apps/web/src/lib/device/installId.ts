const KEY = 'sentinela:install-id';

/**
 * Identificador estável deste navegador.
 *
 * Gerado localmente e guardado só aqui: é o que permite dizer "esta é a sessão
 * do seu notebook" sem fingerprinting. Limpar os dados do site gera outro id e
 * o aparelho antigo simplesmente envelhece na lista — comportamento correto,
 * porque o objetivo é reconhecer o próprio equipamento, não rastrear alguém.
 */
export function getInstallId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Navegação privada / storage bloqueado: sem id estável, não registramos.
    return null;
  }
}

/** Nome legível do navegador para a lista de aparelhos. */
export function describeBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Navegador';
}

export function describeOS(ua: string): string {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Desconhecido';
}
