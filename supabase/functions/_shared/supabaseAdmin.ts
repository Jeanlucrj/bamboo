import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Cliente com service_role: IGNORA RLS.
 * Só existe dentro de Edge Functions. Nunca exponha esta chave ao cliente.
 */
export function admin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Rejeita chamadas que não venham do cron.
 *
 * Aceita DOIS segredos, e a ordem importa:
 *
 *   CRON_SECRET               credencial dedicada, é o caminho correto
 *   SUPABASE_SERVICE_ROLE_KEY compatibilidade com o desenho anterior
 *
 * O desenho anterior fazia o cron autenticar com a chave mestra do banco: para
 * disparar uma varredura, ele carregava uma credencial capaz de apagar
 * qualquer dado de qualquer usuário. Privilégio muito além da tarefa — e, na
 * prática, também impossível de configurar sem passar a chave mestra por
 * canais onde ela não deveria estar.
 *
 * CRON_SECRET só serve para invocar estas funções. Vazando, o estrago máximo é
 * alguém rodar a varredura fora de hora; e trocá-lo é um comando, sem tocar em
 * nada mais do projeto.
 *
 * A comparação é de tempo constante para não vazar o segredo caractere a
 * caractere pela diferença de tempo de resposta.
 */
export function assertServiceRole(req: Request): void {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'cron_secret_required');

  const aceitos = [Deno.env.get('CRON_SECRET'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')]
    .filter((v): v is string => Boolean(v));

  if (!aceitos.some((s) => igualEmTempoConstante(token, s))) {
    throw new HttpError(401, 'cron_secret_required');
  }
}

function igualEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
