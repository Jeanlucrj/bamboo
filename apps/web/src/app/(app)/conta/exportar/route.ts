import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Portabilidade de dados (LGPD art. 18 V / GDPR art. 20).
 *
 * Route handler e não Server Action porque o resultado é um download: o
 * navegador precisa de um corpo com Content-Disposition, coisa que uma action
 * não devolve.
 *
 * Toda consulta aqui roda com o JWT do usuário e passa pela RLS — não há
 * nenhum filtro `eq('user_id', ...)` de segurança neste arquivo porque a
 * política do banco já é o filtro. Se alguma tabela vazasse dado de terceiro
 * aqui, o bug estaria na policy, e é lá que ele deve ser corrigido.
 */
export async function GET() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });

  const [perfil, viagens, contatos, dossie, aparelhos, sinais, alertas, acessos] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('travel_sessions').select('*').order('starts_at', { ascending: false }),
      supabase.from('emergency_contacts').select('*').order('priority'),
      supabase.from('emergency_dossiers').select('*').maybeSingle(),
      supabase.from('devices').select('*').order('last_seen_at', { ascending: false }),
      // Localização crua fica de fora: são potencialmente centenas de milhares
      // de linhas e o download travaria o navegador. O histórico agregado vai
      // em `diario`; o bruto sai por pedido ao suporte, em lote.
      supabase.from('signals').select('*').order('occurred_at', { ascending: false }).limit(5000),
      supabase.from('alerts').select('*').order('triggered_at', { ascending: false }),
      supabase.from('dossier_access_log').select('*').order('accessed_at', { ascending: false }),
    ]);

  const { data: diario } = await supabase.rpc('get_my_travel_stats');
  const { data: paises } = await supabase
    .from('v_user_country_visits')
    .select('*')
    .order('entered_at', { ascending: false });

  const payload = {
    exportado_em: new Date().toISOString(),
    aviso:
      'Exportação de dados pessoais do Sentinela. Contém informação sensível — trate como documento confidencial.',
    conta: { id: user.id, email: user.email, criada_em: user.created_at },
    perfil: perfil.data,
    dossie_medico: dossie.data,
    contatos_de_emergencia: contatos.data ?? [],
    viagens: viagens.data ?? [],
    aparelhos: aparelhos.data ?? [],
    sinais_de_vida: sinais.data ?? [],
    alertas: alertas.data ?? [],
    acessos_ao_dossie: acessos.data ?? [],
    diario_de_bordo: (diario ?? [])[0] ?? null,
    paises_visitados: paises ?? [],
    nao_incluido: {
      localizacao_bruta:
        'O histórico de GPS ponto a ponto não entra neste arquivo por volume. Peça ao suporte para receber em lote.',
    },
  };

  const data = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="sentinela-meus-dados-${data}.json"`,
      // Dado pessoal não pode ficar em cache de proxy nenhum.
      'Cache-Control': 'no-store, private',
    },
  });
}
