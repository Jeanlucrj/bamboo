import { supabase } from './supabase';

/**
 * Converte o deep link do e-mail em sessão autenticada.
 *
 * Sem isto o app abria pelo link e não fazia nada: o token chegava na URL e
 * ninguém o lia. O cliente é criado com `detectSessionInUrl: false` — correto
 * em React Native, onde não existe `window.location` para o supabase-js
 * inspecionar sozinho — mas isso transfere a responsabilidade para cá, e essa
 * parte nunca havia sido escrita.
 *
 * Trata as três formas porque qual delas chega depende de configuração que
 * pode mudar sem aviso (fluxo do cliente, template de e-mail no painel):
 *
 *   #access_token=…&refresh_token=…   fluxo implícito, o padrão do supabase-js
 *   ?code=…                           fluxo PKCE
 *   ?token_hash=…&type=…              template com {{ .TokenHash }}
 */
export type LinkResult =
  | { handled: false }
  | { handled: true; ok: true }
  | { handled: true; ok: false; error: string };

export async function handleAuthLink(url: string): Promise<LinkResult> {
  const params = extrairParams(url);
  if (!params) return { handled: false };

  const erro = params.get('error_description') ?? params.get('error');
  if (erro) return { handled: true, ok: false, error: traduzir(erro) };

  // 1. Implícito — token no fragmento.
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error
      ? { handled: true, ok: false, error: traduzir(error.message) }
      : { handled: true, ok: true };
  }

  // 2. PKCE.
  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error
      ? { handled: true, ok: false, error: traduzir(error.message) }
      : { handled: true, ok: true };
  }

  // 3. Template com token_hash.
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      // 'magiclink' | 'signup' | 'recovery' | 'invite' | 'email_change'
      type: type as 'magiclink',
    });
    return error
      ? { handled: true, ok: false, error: traduzir(error.message) }
      : { handled: true, ok: true };
  }

  return { handled: false };
}

/**
 * Junta query string e fragmento num só saco de parâmetros.
 *
 * O deep link pode trazer o dado depois de `?` ou de `#`, e às vezes os dois.
 * `new URL()` não é confiável aqui: em React Native ele vem de um polyfill e
 * esquemas customizados (`sentinela://`) quebram o parser em algumas versões.
 * Fatiar a string é feio e funciona sempre.
 */
function extrairParams(url: string): URLSearchParams | null {
  if (!url) return null;

  const params = new URLSearchParams();
  let restante = url;

  const hash = restante.indexOf('#');
  if (hash >= 0) {
    for (const [k, v] of new URLSearchParams(restante.slice(hash + 1))) params.set(k, v);
    restante = restante.slice(0, hash);
  }

  const query = restante.indexOf('?');
  if (query >= 0) {
    for (const [k, v] of new URLSearchParams(restante.slice(query + 1))) params.set(k, v);
  }

  // Só vale a pena seguir se houver algo de autenticação aqui — um link
  // qualquer que abra o app não deve ser tratado como tentativa de login.
  const chaves = ['access_token', 'code', 'token_hash', 'error', 'error_description'];
  return chaves.some((c) => params.has(c)) ? params : null;
}

function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('expired') || m.includes('invalid')) {
    return 'O link expirou ou já foi usado. Peça um novo.';
  }
  if (m.includes('rate limit') || m.includes('for security purposes')) {
    return 'Muitas tentativas seguidas. Aguarde um minuto.';
  }
  return 'Não foi possível concluir o acesso. Peça um link novo.';
}
