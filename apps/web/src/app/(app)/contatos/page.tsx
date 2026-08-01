import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/requireUser';
import { ContatosPanel, type ContatoRow } from '@/components/app/ContatosPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contatos de emergência',
  robots: { index: false, follow: false },
};

export default async function ContatosPage() {
  const { supabase, user } = await requireUser('/contatos');

  const { data } = await supabase
    .from('emergency_contacts')
    .select('id, full_name, relationship, email, phone, preferred_channel, priority, is_verified')
    .eq('user_id', user.id)
    .order('priority', { ascending: true });

  return (
    <>
      <h1 className="text-2xl font-bold text-white">Contatos de emergência</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Quem recebe o Dossiê se você parar de dar sinal de vida. Eles não veem nada enquanto está
        tudo bem — nem sua localização, nem seus dados médicos.
      </p>

      <div className="mt-8">
        <ContatosPanel contatos={(data ?? []) as ContatoRow[]} />
      </div>

      <p className="mt-8 text-xs leading-relaxed text-slate-600">
        O acesso de cada contato passa por um link com validade e é registrado. Você vê quem abriu
        seu dossiê e quando — transparência aqui é funcionalidade, não cortesia.
      </p>
    </>
  );
}
