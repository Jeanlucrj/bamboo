import { useState } from 'react';
import { ScrollView, View, Alert, Share } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { spacing } from '../../src/theme';
import { Tela, Rotulo, Paragrafo, Botao, Aviso } from '../../src/components/Ui';

/**
 * Portabilidade de dados (LGPD art. 18 V / GDPR art. 20).
 *
 * Usa a folha de compartilhamento do sistema em vez de gravar arquivo: o
 * usuário escolhe para onde vai — e-mail, Drive, outro app — sem o Sentinela
 * precisar de permissão de armazenamento nem manter cópia de dado sensível no
 * disco do aparelho.
 */
export default function Exportar() {
  const [gerando, setGerando] = useState(false);

  async function exportar() {
    setGerando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada. Entre novamente.');

      const [perfil, viagens, contatos, dossie, aparelhos, alertas, paises] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('travel_sessions').select('*').order('starts_at', { ascending: false }),
        supabase.from('emergency_contacts').select('*').order('priority'),
        supabase.from('emergency_dossiers').select('*').maybeSingle(),
        supabase.from('devices').select('*'),
        supabase.from('alerts').select('*').order('triggered_at', { ascending: false }),
        supabase.from('v_user_country_visits').select('*').order('entered_at', { ascending: false }),
      ]);

      const { data: diario } = await supabase.rpc('get_my_travel_stats');

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
        alertas: alertas.data ?? [],
        paises_visitados: paises.data ?? [],
        diario_de_bordo: (diario ?? [])[0] ?? null,
        nao_incluido: {
          localizacao_bruta:
            'O histórico de GPS ponto a ponto não entra por volume. Peça ao suporte para receber em lote.',
        },
      };

      await Share.share({
        title: 'Meus dados — Sentinela',
        message: JSON.stringify(payload, null, 2),
      });
    } catch (e) {
      Alert.alert('Não foi possível exportar', String(e instanceof Error ? e.message : e));
    } finally {
      setGerando(false);
    }
  }

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Rotulo>O que vai no arquivo</Rotulo>
        <Paragrafo>
          Perfil, dossiê médico, contatos de emergência, viagens, aparelhos, alertas, países
          visitados e os números do diário de bordo. Em JSON, legível por qualquer ferramenta.
        </Paragrafo>

        <View style={{ height: spacing.lg }} />
        <Botao label="Exportar meus dados" onPress={exportar} ocupado={gerando} />

        <View style={{ height: spacing.lg }} />
        <Aviso tom="atencao" titulo="Contém dado sensível">
          O arquivo inclui seu dossiê médico e seu histórico de países. Cuidado para onde envia —
          depois de sair do aparelho, o controle é seu.
        </Aviso>

        <View style={{ height: spacing.md }} />
        <Aviso tom="info" titulo="Localização ponto a ponto fica de fora">
          São potencialmente centenas de milhares de registros e travariam o compartilhamento.
          Peça ao suporte para recebê-los em lote.
        </Aviso>
      </ScrollView>
    </Tela>
  );
}
