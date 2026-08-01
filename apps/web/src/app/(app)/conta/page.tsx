import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/requireUser';
import { RegisterWebDevice } from '@/components/device/RegisterWebDevice';
import { DeviceList, type DeviceRow } from '@/components/device/DeviceList';
import {
  PerfilForm, DossieForm, ZonaDePerigo,
  type PerfilRow, type DossieRow,
} from '@/components/app/ContaPanels';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Conta',
  robots: { index: false, follow: false },
};

export default async function ContaPage() {
  const { supabase, user } = await requireUser('/conta');

  const [{ data: perfil }, { data: dossie }, { data: devices }, { data: acessos }] =
    await Promise.all([
      supabase.from('profiles').select('full_name, phone, home_country').eq('id', user.id).single(),
      supabase
        .from('emergency_dossiers')
        .select(
          'blood_type, allergies, medications, medical_conditions, passport_masked, insurance_provider, insurance_policy, additional_notes',
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('devices')
        .select(
          'id, platform, install_id, label, model, os_version, app_version, is_primary, last_seen_at, last_signal_at',
        )
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('last_seen_at', { ascending: false }),
      supabase
        .from('dossier_access_log')
        .select('id, ip, user_agent, accessed_at')
        .order('accessed_at', { ascending: false })
        .limit(20),
    ]);

  return (
    <>
      <RegisterWebDevice />

      <h1 className="text-2xl font-bold text-white">Conta</h1>
      <p className="mt-2 text-sm text-slate-400">{user.email}</p>

      <div className="mt-8 space-y-4">
        <PerfilForm perfil={(perfil ?? { full_name: '', phone: null, home_country: null }) as PerfilRow} />

        <DossieForm dossie={(dossie ?? null) as DossieRow} />

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
          <h2 className="text-lg font-bold text-white">Seus aparelhos</h2>
          <p className="mt-2 text-sm text-slate-400">
            Só o app instalado no celular gera sinal de vida. Navegador é acesso administrativo.
          </p>
          <div className="mt-6">
            <DeviceList devices={(devices ?? []) as DeviceRow[]} />
          </div>
        </section>

        {/* Transparência aqui é funcionalidade, não cortesia: quem entrega o
            próprio histórico médico a terceiros tem direito de saber quando
            alguém abriu. */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
          <h2 className="text-lg font-bold text-white">Quem abriu seu dossiê</h2>
          {(acessos ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Ninguém acessou seu dossiê. Ele só fica disponível durante um incidente aberto, por
              link com validade.
            </p>
          ) : (
            <ul className="mt-5 space-y-2">
              {(acessos ?? []).map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
                >
                  <p className="text-slate-300">{formatDateTime(a.accessed_at)}</p>
                  <p className="text-xs text-slate-600">
                    {a.ip ? `IP ${a.ip}` : 'IP não registrado'}
                    {a.user_agent ? ` · ${a.user_agent.slice(0, 80)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
          <h2 className="text-lg font-bold text-white">Seus dados</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Baixe tudo o que guardamos sobre você em um arquivo JSON: perfil, viagens, sinais,
            contatos, dossiê, aparelhos e o histórico de acessos.
          </p>
          <a
            href="/conta/exportar"
            download
            className="mt-5 inline-block rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-700"
          >
            Exportar meus dados
          </a>
          <p className="mt-3 text-xs text-slate-600">
            O histórico de GPS ponto a ponto fica de fora por volume — peça ao suporte para
            recebê-lo em lote.
          </p>
        </section>

        <ZonaDePerigo />
      </div>
    </>
  );
}
