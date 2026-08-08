import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { registerForPush } from '../../src/services/notifications';
import { spacing, radius, type as typo, useColors } from '../../src/theme';

/**
 * Priming da permissão de notificação — o último passo do onboarding.
 *
 * Existe pelo mesmo motivo da tela de localização: o prompt nativo é uma
 * pergunta sem contexto, e negar aqui tem consequência específica que o
 * usuário não tem como adivinhar. Sem push, o aviso do estado `grace` — o
 * ÚNICO que chega antes de acionar a família — nunca aparece. A pessoa
 * descobre que estava atrasada quando a mãe já foi avisada.
 */
export default function PermissoesNotificacao() {
  const router = useRouter();
  const c = useColors();
  const [pedindo, setPedindo] = useState(false);
  const [negado, setNegado] = useState(false);

  async function pedir() {
    setPedindo(true);
    const token = await registerForPush();
    setPedindo(false);

    if (token) concluir();
    else setNegado(true);
  }

  // Aberta pelo Perfil, esta tela precisa devolver o usuário de onde ele veio.
  // O `replace('/(tabs)')` fixo o jogava na Home e o fazia navegar de novo até
  // as configurações para continuar o que estava fazendo.
  const { origem } = useLocalSearchParams<{ origem?: string }>();

  function concluir() {
    if (origem === 'ajustes') router.back();
    else router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🔔</Text>

        <Text
          style={{
            ...typo.h1, color: c.text, textAlign: 'center',
            marginTop: spacing.lg, lineHeight: 36,
          }}
        >
          Deixe a gente avisar{'\n'}você primeiro
        </Text>

        <Text
          style={{
            ...typo.body, color: c.textMuted, textAlign: 'center',
            marginTop: spacing.md, lineHeight: 24,
          }}
        >
          Se você passar do horário do check-in, mandamos uma notificação só para você. É a sua
          chance de dizer que está tudo bem antes que seus contatos sejam acionados.
        </Text>

        <View
          style={{
            marginTop: spacing.xl, backgroundColor: c.surfaceAlt,
            borderRadius: radius.md, padding: spacing.md,
            borderLeftWidth: 3, borderLeftColor: c.grace,
          }}
        >
          <Text style={{ ...typo.small, color: c.text, fontWeight: '700' }}>
            Sem notificação, não há aviso prévio
          </Text>
          <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 4, lineHeight: 18 }}>
            O alarme continua funcionando, mas você perde o degrau que existe para evitar falso
            positivo — e descobre o atraso quando sua família já foi avisada.
          </Text>
        </View>

        {Platform.OS === 'ios' && (
          <Text style={{ ...typo.caption, color: c.textFaint, marginTop: spacing.md, lineHeight: 18 }}>
            No iPhone, alertas críticos atravessam o Modo Foco — mas dependem de autorização da
            Apple, que pode não estar liberada ainda.
          </Text>
        )}

        {negado && (
          <View
            style={{
              marginTop: spacing.lg, backgroundColor: c.surfaceAlt,
              borderRadius: radius.md, padding: spacing.md,
              borderLeftWidth: 3, borderLeftColor: c.alert,
            }}
          >
            <Text style={{ ...typo.small, color: c.text, fontWeight: '700' }}>
              Notificações bloqueadas
            </Text>
            <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 4, lineHeight: 18 }}>
              Você pode liberar depois em Ajustes do sistema. O app funciona sem isso — só perde
              o aviso antecipado.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Pressable
          onPress={pedir}
          disabled={pedindo}
          style={{
            height: 56, borderRadius: radius.md, backgroundColor: c.brand,
            alignItems: 'center', justifyContent: 'center', opacity: pedindo ? 0.6 : 1,
          }}
        >
          <Text style={{ ...typo.body, color: '#fff', fontWeight: '700' }}>
            {pedindo ? 'Aguardando…' : 'Ativar notificações'}
          </Text>
        </Pressable>

        <Pressable onPress={concluir} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...typo.small, color: c.textFaint }}>
            {negado ? 'Continuar assim mesmo' : 'Agora não'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
