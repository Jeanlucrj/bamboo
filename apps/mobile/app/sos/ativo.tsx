import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, BackHandler, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useSessionStore } from '../../src/stores/session';
import { triggerSos, cancelSos, type SosResult } from '../../src/services/sos';
import { getCurrentPosition } from '../../src/services/location/backgroundLocation';
import { colors, spacing, radius, type as typo } from '../../src/theme';

type Phase =
  | { kind: 'sending' }
  | { kind: 'sent'; result: Extract<SosResult, { ok: true }> }
  | { kind: 'failed'; error: string }
  | { kind: 'cancelled' };

/**
 * Tela de SOS ativo — modal em tela cheia, sem gesto de dismiss.
 *
 * O acionamento acontece AQUI, não na home. A home mandava `triggerSos` e só
 * navegava depois do await: o usuário ficava olhando para a tela anterior por
 * vários segundos (a corrida de 3 s pela posição mais a ida à rede) sem
 * nenhuma confirmação de que algo estava acontecendo. Em pânico, esse silêncio
 * faz a pessoa apertar de novo. Trazendo a chamada para cá, a tela vermelha
 * aparece no mesmo instante do toque e o progresso fica visível.
 */
export default function SosAtivo() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const reload = useSessionStore((s) => s.load);

  const [phase, setPhase] = useState<Phase>({ kind: 'sending' });
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number | null } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  // StrictMode / remontagem não podem disparar dois SOS.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !session) return;
    fired.current = true;

    (async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const result = await triggerSos(session.id);

      if (result.ok) {
        setPhase({ kind: 'sent', result });
        await reload();
      } else {
        setPhase({ kind: 'failed', error: result.error });
      }
    })();
  }, [session?.id]);

  // Posição só para exibir. O envio já capturou a dele — se esta falhar ou
  // demorar, o SOS não é afetado.
  useEffect(() => {
    getCurrentPosition()
      .then((p) =>
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      )
      .catch(() => setCoords(null));
  }, []);

  // Botão físico de voltar do Android sairia da tela deixando o alerta aberto
  // sem que o usuário perceba. Sair daqui exige ação explícita.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase.kind === 'cancelled' || phase.kind === 'failed') return false;
      Alert.alert(
        'O alerta continua ativo',
        'Seus contatos já foram avisados. Use "Estou bem, cancelar" para encerrar.',
      );
      return true;
    });
    return () => sub.remove();
  }, [phase.kind]);

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.title}>Nenhuma viagem ativa</Text>
          <Text style={styles.body}>
            O SOS precisa de uma sessão de viagem em andamento para saber quem avisar.
          </Text>
          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryLabel}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  async function onCancel() {
    if (phase.kind !== 'sent') return;

    // Só o caminho de servidor tem alertId. No fallback por SMS a mensagem já
    // saiu do aparelho e não existe nada para revogar — mentir dizendo
    // "cancelado" seria pior do que explicar.
    if (phase.result.via !== 'server') {
      Alert.alert(
        'Avise seus contatos',
        'O alerta foi enviado por SMS direto do seu celular, sem passar pelo servidor. Não há como cancelá-lo aqui — mande uma mensagem avisando que está tudo bem.',
        [{ text: 'Entendi', onPress: () => router.back() }],
      );
      return;
    }

    setBusy(true);
    const { error } = await cancelSos(phase.result.alertId, 'Cancelado pelo usuário no app');
    setBusy(false);

    if (error) {
      Alert.alert('Não foi possível cancelar', String(error.message ?? error));
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase({ kind: 'cancelled' });
    await reload();
  }

  function retry() {
    fired.current = false;
    setPhase({ kind: 'sending' });
    if (session) {
      triggerSos(session.id).then((r) =>
        setPhase(r.ok ? { kind: 'sent', result: r } : { kind: 'failed', error: r.error }),
      );
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>EMERGÊNCIA ACIONADA</Text>
        <Text style={styles.headline}>
          {phase.kind === 'cancelled' ? 'Alerta encerrado' : 'Estamos avisando todo mundo'}
        </Text>

        <View style={styles.statusCard}>
          {phase.kind === 'sending' && (
            <>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.statusTitle}>Contatos sendo avisados…</Text>
              <Text style={styles.statusBody}>
                Não feche o app. Se a rede falhar, tentamos por SMS direto do aparelho.
              </Text>
            </>
          )}

          {phase.kind === 'sent' && phase.result.via === 'server' && (
            <>
              <Text style={styles.bigNumber}>{phase.result.contactsNotified}</Text>
              <Text style={styles.statusTitle}>
                {phase.result.contactsNotified === 1
                  ? 'contato notificado'
                  : 'contatos notificados'}
              </Text>
              <Text style={styles.statusBody}>
                Cada um recebeu um link com sua última localização, seus dados médicos e os
                telefones de emergência do país onde você está.
              </Text>
            </>
          )}

          {phase.kind === 'sent' && phase.result.via === 'native-sms' && (
            <>
              <Text style={styles.bigNumber}>{phase.result.recipients}</Text>
              <Text style={styles.statusTitle}>avisados por SMS</Text>
              <Text style={styles.statusBody}>
                O servidor não respondeu, então enviamos SMS direto do seu celular. Funciona em
                rede fraca — mas não dá para cancelar por aqui.
              </Text>
            </>
          )}

          {phase.kind === 'failed' && (
            <>
              <Text style={styles.statusTitle}>Não conseguimos avisar ninguém</Text>
              <Text style={styles.statusBody}>{phase.error}</Text>
              <Text style={[styles.statusBody, { marginTop: spacing.sm }]}>
                Se puder, ligue diretamente para alguém agora.
              </Text>
            </>
          )}

          {phase.kind === 'cancelled' && (
            <>
              <Text style={styles.statusTitle}>Avisamos que foi alarme falso</Text>
              <Text style={styles.statusBody}>
                Todos os contatos acionados receberam a confirmação e os links do dossiê foram
                revogados.
              </Text>
            </>
          )}
        </View>

        <View style={styles.coordsCard}>
          <Text style={styles.coordsLabel}>LOCALIZAÇÃO TRANSMITIDA</Text>
          {coords ? (
            <>
              <Text style={styles.coordsValue}>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
              <Text style={styles.coordsHint}>
                {coords.acc ? `precisão de ~${Math.round(coords.acc)} m` : 'precisão desconhecida'}
              </Text>
            </>
          ) : (
            <Text style={styles.coordsHint}>
              Obtendo posição… enviamos o último ponto conhecido de qualquer forma.
            </Text>
          )}
        </View>

        <View style={{ height: spacing.xl }} />

        {phase.kind === 'failed' && (
          <Pressable style={styles.primary} onPress={retry}>
            <Text style={styles.primaryLabel}>Tentar de novo</Text>
          </Pressable>
        )}

        {phase.kind === 'sent' && (
          <Pressable style={styles.primary} disabled={busy} onPress={onCancel}>
            {busy ? (
              <ActivityIndicator color={colors.alert} />
            ) : (
              <Text style={styles.primaryLabel}>Estou bem, cancelar</Text>
            )}
          </Pressable>
        )}

        {(phase.kind === 'cancelled' || phase.kind === 'failed') && (
          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryLabel}>Voltar ao início</Text>
          </Pressable>
        )}

        <Text style={styles.legal}>
          O Sentinela é uma ferramenta de apoio e não substitui os serviços oficiais de
          emergência. Se houver risco imediato, acione as autoridades locais.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Esta tela NÃO acompanha o tema, de propósito.
 *
 * O vermelho escuro em tela cheia é o sinal de que algo grave está em curso.
 * Trocar para fundo claro porque o usuário prefere modo claro tiraria
 * justamente o que faz a tela ser reconhecida num relance — e ela é usada por
 * alguém em pânico, que não vai ler hierarquia visual sutil.
 *
 * É a única exceção à migração de tema no app.
 */
const styles = StyleSheet.create({
  // Vermelho escuro em tela cheia: quem está usando esta tela não vai ler
  // hierarquia visual sutil. Tudo grande, contraste alto, poucos elementos.
  screen: { flex: 1, backgroundColor: '#450A0A' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl },

  eyebrow: { ...typo.caption, color: '#FCA5A5', letterSpacing: 2, textAlign: 'center' },
  headline: {
    ...typo.display,
    color: '#fff',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: { ...typo.h1, color: '#fff', textAlign: 'center' },
  body: {
    ...typo.body, color: '#FCA5A5', textAlign: 'center',
    marginTop: spacing.md, lineHeight: 24,
  },

  statusCard: {
    backgroundColor: '#7F1D1D',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  bigNumber: { fontSize: 64, fontWeight: '800', color: '#fff', lineHeight: 70 },
  statusTitle: { ...typo.h2, color: '#fff', textAlign: 'center', marginTop: spacing.sm },
  statusBody: {
    ...typo.small, color: '#FECACA', textAlign: 'center',
    marginTop: spacing.xs, lineHeight: 20,
  },

  coordsCard: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  coordsLabel: { ...typo.caption, color: '#FCA5A5', letterSpacing: 1.2 },
  coordsValue: { ...typo.h2, color: '#fff', marginTop: 4, fontVariant: ['tabular-nums'] },
  coordsHint: { ...typo.caption, color: '#FCA5A5', marginTop: 2, lineHeight: 17 },

  primary: {
    height: 60,
    // Pílula, como o resto do app depois do redesenho.
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Vermelho ESCURO, e não `colors.alert`.
  //
  // O `alert` da paleta foi clareado para #F87171 no redesenho, porque lá ele
  // aparece como texto e traço sobre preto. Aqui ele é tinta sobre um botão
  // BRANCO, e nessa combinação cai para cerca de 2,5:1 de contraste — ilegível.
  // O único botão que encerra um alarme em curso não pode depender de o
  // usuário estar num ambiente com pouca luz para ser lido.
  primaryLabel: { ...typo.h2, color: '#991B1B' },

  secondary: {
    height: 52,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { ...typo.body, color: '#FCA5A5', fontWeight: '600' },

  legal: {
    ...typo.caption, color: '#F87171', textAlign: 'center',
    marginTop: spacing.xl, lineHeight: 17,
  },
});
