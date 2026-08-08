import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Linking, Alert } from 'react-native';
import { PLANS } from '@sentinela/shared';
import { supabase } from '../../src/services/supabase';
import { spacing, type as typo, useColors } from '../../src/theme';
import { Tela, Cartao, Linha, Rotulo, Paragrafo, Botao, Aviso } from '../../src/components/Ui';

type Assinatura = {
  plan: string;
  status: string;
  current_period_end: string | null;
};

/**
 * `sentinela.app` era o valor padrão daqui — um domínio que não existe. Como
 * `EXPO_PUBLIC_SITE_URL` não está definida em nenhum ambiente, o botão "Abrir
 * no site" abria o navegador num endereço inexistente, sempre.
 *
 * Sem site configurado, a seção de gerenciamento não aparece. Um botão que
 * leva a lugar nenhum é pior que a ausência dele.
 */
const SITE = process.env.EXPO_PUBLIC_SITE_URL?.trim() || null;

export default function AssinaturaScreen() {
  const c = useColors();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setAssinatura((data ?? null) as Assinatura | null);
        setCarregando(false);
      });
  }, []);

  const plano = assinatura?.plan ?? 'explorador';
  const meta = PLANS[plano as keyof typeof PLANS] ?? PLANS.explorador;
  const ativa = assinatura?.status === 'active' || assinatura?.status === 'trialing';

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Rotulo>Seu plano</Rotulo>

        <Cartao>
          <Linha label="Plano" valor={carregando ? '…' : meta.name} />
          <Linha
            label="Situação"
            valor={carregando ? '…' : ativa ? 'ativa' : assinatura ? assinatura.status : 'gratuito'}
          />
          <Linha
            label="Renova em"
            valor={
              assinatura?.current_period_end
                ? new Date(assinatura.current_period_end).toLocaleDateString('pt-BR')
                : '—'
            }
            ultima
          />
        </Cartao>

        {!ativa && (
          <>
            <View style={{ height: spacing.lg }} />
            <Aviso tom="atencao" titulo="No plano gratuito você precisa lembrar">
              O check-in passivo por deslocamento — o que faz o cronômetro zerar sozinho quando
              você anda — é do plano Nômade. No Explorador, esquecer do check-in manual significa
              acionar sua família sem motivo.
            </Aviso>
          </>
        )}

        <View style={{ height: spacing.lg }} />
        <Rotulo>Gerenciar</Rotulo>
        <Paragrafo>
          Assinatura, troca de plano e cancelamento são feitos pelo site. Compra dentro do app
          exigiria a cobrança da loja, que retém percentual e complica o cancelamento.
        </Paragrafo>

        {SITE ? (
          <>
            <View style={{ height: spacing.md }} />
            <Botao
              label="Abrir no site"
              tom="neutro"
              onPress={() => {
                Linking.openURL(`${SITE}/precos`).catch(() =>
                  Alert.alert('Não foi possível abrir', `Acesse ${SITE}/precos pelo navegador.`),
                );
              }}
            />
          </>
        ) : (
          <>
            <View style={{ height: spacing.md }} />
            <Aviso tom="info" titulo="Cobrança ainda não está no ar">
              Enquanto isso todo mundo usa o plano completo. Quando a assinatura entrar, este
              botão leva direto para a página de planos.
            </Aviso>
          </>
        )}

        <View style={{ height: spacing.xl }} />
        <Text style={{ ...typo.caption, color: c.textFaint, lineHeight: 18 }}>
          Cancelar não apaga nada: seu histórico e o diário de bordo permanecem, e a conta volta
          ao plano Explorador ao fim do período já pago.
        </Text>
      </ScrollView>
    </Tela>
  );
}
