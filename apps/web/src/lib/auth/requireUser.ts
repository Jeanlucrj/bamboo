import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Guarda das rotas de conta.
 */
export async function requireUser(next: string) {
  const supabase = await createServerClient();
  let user = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl.includes('placeholder')) {
      user = null;
    } else {
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 2500),
      );
      const { data } = await Promise.race([userPromise, timeoutPromise]);
      user = data?.user ?? null;
    }
  } catch {
    user = null;
  }

  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
