import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Guarda das rotas de conta.
 */
export async function requireUser(next: string) {
  const supabase = await createServerClient();
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (err) {
    user = null;
  }

  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
