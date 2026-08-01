import { notFound, redirect } from 'next/navigation';
import { PLATFORM_ROLES, type PlatformRole } from '@sentinela/shared';
import { createServerClient } from '@/lib/supabase/server';

export function atLeast(role: PlatformRole, min: PlatformRole): boolean {
  return PLATFORM_ROLES.indexOf(role) >= PLATFORM_ROLES.indexOf(min);
}

export async function requireAdmin(min: PlatformRole = 'support') {
  const supabase = await createServerClient();
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (err) {
    user = null;
  }

  if (!user) redirect('/login?next=%2Fadmin');

  const { data: role, error } = await supabase.rpc('admin_my_role');
  if (error || !role || !atLeast(role as PlatformRole, min)) notFound();

  return { supabase, user, role: role as PlatformRole };
}
