import { cookies } from 'next/headers';
import {
  createServerClient as createSSRClient,
  createBrowserClient,
  type CookieOptions,
} from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@sentinela/shared';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cliente autenticado por cookie — para Server Components e Route Handlers. */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient<Database>(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(items: CookieToSet[]) {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component não pode escrever cookie. O middleware cuida do
          // refresh da sessão — ignorar aqui é o comportamento correto.
        }
      },
    },
  });
}

/**
 * Cliente anônimo, sem cookie.
 * Usado pela página pública do dossiê: ela não tem usuário logado e o acesso
 * é autorizado pelo token via RPC SECURITY DEFINER.
 */
export function createAnonClient() {
  return createClient<Database>(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * service_role — IGNORA RLS. Só em Route Handlers de webhook (Stripe etc.).
 * Nunca importe isto em componente que renderize no cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente');
  return createClient<Database>(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { createBrowserClient };
