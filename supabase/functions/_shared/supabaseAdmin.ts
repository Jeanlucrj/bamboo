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
 * Rejeita chamadas que não venham do cron/servidor.
 * As funções de escalonamento não podem ser disparadas por um usuário qualquer.
 */
export function assertServiceRole(req: Request): void {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    throw new HttpError(401, 'service_role_required');
  }
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
