import { useCallback, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PLANS, VIAGENS_GRATIS, formatarPreco } from '@sentinela/shared';

import { supabase } from '../../src/services/supabase';
import { spacing, radius, type as typo, useColors } from '../../src/theme';
import { Tela, Cartao, Linha, Rotulo, Paragrafo, Aviso, Botao } from '../../src/components/Ui';

type Plano = {
  viagens_usadas: number;
  viagens_gratis: number;
  assinante: boolean;
  pode_criar: boolean;
  plano: string;
  status: string;
  renova_em: string | null;
};

/**
 * Assinatura.
 *
 * O número que importa aqui é quantas viagens ainda dá para criar. Antes esta
 * tela mostrava só "Plano: Explorador" — um rótulo que não dizia nem o que a
 * pessoa tem, nem o que ela perde.
 *
 * Tudo vem de `meu_plano()`, a mesma função que o site consome. Se cada tela
 * montasse a própria conta, uma diria "resta 1 viagem" e a outra "pode criar",
 * e a divergência apareceria justo na hora de cobrar.
 */
export default function Assinatura() {
  const c = useColors();
  const [p, setP] = useState<Plano | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      supabase.rpc('meu_plano').then(({ data }) => {
        if (vivo) setP(((data ?? [])[0] as Plano) ?? null);
      });
      return () => {
        vivo = false;
      };
    }, []),
  );

  const restantes = p ? Math.max(0, p.viagens_gratis - p.viagens_usadas) : null;
  const preco = formatarPreco(PLANS.sentinela.price);

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {p?.assinante ? (
          <>
            <Rotulo>Sua assinatura</Rotulo>
            <Cartao>
              <Linha label="Plano" valor={PLANS.sentinela.name} />
              <Linha label="Situação" valor={p.status === 'trialing' ? 'em teste' : 'ativa'} />
              <Linha
                label="Renova em"
                valor={p.renova_em ? new Date(p.renova_em).toLocaleDateString('pt-BR') : '—'}
                ultima
              />
            </Cartao>

            <View style={{ height: spacing.lg }} />
            <Aviso tom="info" titulo="Viagens ilimitadas">
              Enquanto a assinatura estiver ativa, não há limite de viagens nem de contatos.
            </Aviso>
          </>
        ) : (
          <>
            {/* O contador é o herói da tela: é ele que responde "quanto ainda
                tenho" sem a pessoa precisar somar nada. */}
            <View
              style={{
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: restantes === 0 ? c.alert : c.border,
                padding: spacing.lg,
              }}
            >
              <Text
                style={{
                  fontSize: 56,
                  fontWeight: '800',
                  color: restantes === 0 ? c.alert : c.brandLight,
                  lineHeight: 62,
                }}
              >
                {restantes ?? '—'}
              </Text>
              <Text style={{ ...typo.body, color: c.text, fontWeight: '700' }}>
                {restantes === 1 ? 'viagem gratuita restante' : 'viagens gratuitas restantes'}
              </Text>
              <Text
                style={{
                  ...typo.caption, color: c.textMuted,
                  marginTop: 4, textAlign: 'center',
                }}
              >
                {p ? `${p.viagens_usadas} de ${p.viagens_gratis} usadas` : 'carregando…'}
              </Text>
            </View>

            {restantes === 0 ? (
              <>
                <View style={{ height: spacing.md }} />
                <Aviso tom="perigo" titulo="Suas viagens gratuitas acabaram">
                  Suas viagens anteriores, contatos e o dossiê continuam salvos. Para iniciar uma
                  nova viagem e voltar a ser monitorado, assine.
                </Aviso>
              </>
            ) : null}

            <Rotulo>Depois do teste</Rotulo>
            <Cartao padding={spacing.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ ...typo.small, color: c.textMuted }}>R$</Text>
                <Text style={{ fontSize: 40, fontWeight: '800', color: c.text, lineHeight: 44 }}>
                  {preco}
                </Text>
                <Text style={{ ...typo.small, color: c.textMuted }}>/mês</Text>
              </View>
              <Text style={{ ...typo.small, color: c.textMuted, marginTop: spacing.sm, lineHeight: 21 }}>
                {PLANS.sentinela.resumo}
              </Text>

              <View style={{ height: spacing.md }} />
              {[
                'Viagens ilimitadas',
                'GPS em segundo plano e check-in passivo',
                'Contatos de emergência e Dossiê médico',
                'Escalonamento automático se você sumir',
                'Diário de bordo com países, cidades e quilômetros',
              ].map((item) => (
                <View key={item} style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 6 }}>
                  <Text style={{ color: c.safe, fontWeight: '800' }}>✓</Text>
                  <Text style={{ ...typo.small, color: c.textMuted, flex: 1, lineHeight: 20 }}>
                    {item}
                  </Text>
                </View>
              ))}
            </Cartao>

            <View style={{ height: spacing.md }} />
            {/* Botão desabilitado de propósito, com o motivo escrito.
                Um "Assinar" que abre erro é pior que um botão apagado que
                explica — e a cobrança ainda não está ligada. */}
            <Botao label="Assinar — em breve" onPress={() => {}} desabilitado />
            <View style={{ height: spacing.sm }} />
            <Paragrafo>
              A cobrança por PIX ainda está sendo ligada. Enquanto isso, ninguém é cobrado e as
              viagens já criadas continuam funcionando normalmente.
            </Paragrafo>
          </>
        )}

        <View style={{ height: spacing.xl }} />
        <Paragrafo>
          Cancelar não apaga nada: seu histórico e o diário de bordo permanecem, e a conta volta ao
          modo gratuito ao fim do período já pago.
        </Paragrafo>
      </ScrollView>
    </Tela>
  );
}
