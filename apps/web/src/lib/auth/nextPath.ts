export const DEFAULT_AFTER_LOGIN = '/dashboard';

/**
 * Sanitiza o `?next=` antes de usá-lo em qualquer redirect.
 *
 * Sem isto, `/login?next=https://phishing.tld` faz o próprio Sentinela mandar o
 * usuário recém-autenticado para fora do domínio — open redirect clássico, e
 * particularmente grave num produto onde o próximo passo é ver dado médico.
 *
 * `//host` e `/\host` também são absolutos para o navegador: viram
 * protocol-relative URLs. Por isso a checagem não é só `startsWith('/')`.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN;
  if (!raw.startsWith('/')) return DEFAULT_AFTER_LOGIN;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_AFTER_LOGIN;
  return raw;
}
