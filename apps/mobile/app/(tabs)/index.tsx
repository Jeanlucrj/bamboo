import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { SignalKind } from '@sentinela/shared';

import { Identidade } from '../../src/components/Identidade';
import { Cronometro } from '../../src/components/Cronometro';
import { Rota } from '../../src/components/Rota';
import { Metricas, Sobre, Pilula } from '../../src/components/Pecas';
import { PanicButton } from '../../src/components/PanicButton';
import { useSessionStore } from '../../src/stores/session';
import { queueSize, flushQueue } from '../../src/services/location/pingQueue';
import { horasDoIntervalo, tempoRelativo } from '../../src/utils/tempo';
import { spacing, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

/**
 * Rótulo curto do sinal, para caber na grade de métricas.
 *
 * `SIGNAL_LABEL` continua sendo a fonte para textos corridos ("Deslocamento
 * detectado"); numa coluna de um terço da tela ele quebraria em três linhas e
 * desalinharia a grade inteira.
 */
const SINAL_CURTO: Record<SignalKind, string> = {
  manual_checkin: 'Check-in',
  device_movement: 'Deslocamento',
  app_open: 'App aberto',
  gps_ping: 'GPS parado',
  sos: 'Pânico',
  admin_override: 'Ajuste',
};

/** Home — Dashboard de Segurança. */
export default function HomeScreen() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  const router = useRouter();
  const { session, loading, error, load, checkIn } = useSessionStore();
  const [pending, setPending] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  // A inscrição de tempo real mora no layout raiz, não aqui.
  //
  // Montada nesta tela, ela subia junto com a Home — que pode renderizar antes
  // de o Supabase terminar de restaurar a sessão salva. Canal aberto sem token
  // é canal que a RLS não alimenta: ele conecta, responde SUBSCRIBED e nunca
  // recebe evento nenhum. No layout ela é criada depois do login conhecido.

  // Recarrega a viagem sempre que a aba voltar a ficar em foco na tela do celular
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    queueSize().then(setPending);
  }, [session?.last_signal_at]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([load(), flushQueue()]);
    setPending(await queueSize());
    setRefreshing(false);
  }

  // Vibração no toque e na confirmação: o check-in costuma ser feito sem olhar
  // para a tela, e o retorno tátil é a única prova de que registrou.
  async function confirmar() {
    if (confirmando) return;
    setConfirmando(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await checkIn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmado(true);
      setTimeout(() => setConfirmado(false), 2500);
    } finally {
      setConfirmando(false);
    }
  }

  function onSos() {
    if (!session) return;
    Alert.alert(
      'Acionar emergência?',
      'Todos os seus contatos serão avisados imediatamente com sua localização.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Acionar SOS',
          style: 'destructive',
          // Navega ANTES de disparar. O triggerSos leva segundos (corrida de
          // 3 s pela posição + ida à rede, com fallback para SMS); esperando
          // aqui, o usuário ficava encarando a home sem nenhum sinal de que
          // algo estava acontecendo — e em pânico isso vira toque repetido.
          // A tela /sos/ativo assume o disparo e mostra o progresso.
          onPress: () => router.push('/sos/ativo'),
        },
      ],
    );
  }

  // Erro antes de loading: se a consulta falhou, insistir em "Carregando…"
  // esconde a causa e deixa o usuário esperando algo que não vem.
  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Não conseguimos carregar</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Text style={styles.link} onPress={() => load()}>
            Tentar de novo
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.muted}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        {/* Também no estado vazio: é a tela que mais aparece para quem está em
            casa, e sem ela a identidade sumiria justamente ali. */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Identidade />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhuma viagem ativa</Text>
          <Text style={styles.emptyBody}>
            O monitoramento só roda durante uma viagem. Crie uma sessão para ativar o
            Dead Man's Switch e o rastreamento em segundo plano.
          </Text>
          <Text style={styles.link} onPress={() => router.push('/viagem/nova')}>
            Criar viagem →
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const intervalo = horasDoIntervalo(session.checkin_interval);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brandLight} />
        }
      >
        <Identidade />

        {/* Título alinhado à esquerda, e não mais centralizado.
            Centralizado ele competia com o cronômetro pelo eixo de leitura;
            à esquerda ele vira o que é — a legenda de qual viagem está sendo
            monitorada, lida em meio segundo antes de o olho descer. */}
        <Text style={styles.tripTitle} numberOfLines={1}>{session.title}</Text>
        {session.destination_label ? (
          <Text style={styles.tripSub} numberOfLines={1}>{session.destination_label}</Text>
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          <Cronometro
            state={session.state}
            lastSignalAt={session.last_signal_at}
            expectedCheckinAt={session.expected_checkin_at}
            gracePeriod={session.grace_period}
            alertDelay={session.alert_delay}
          />
        </View>

        {/* Prova visível de que o check-in passivo funciona. Sem estes números,
            o usuário não tem como saber que o sistema está vivo. */}
        <View style={{ marginTop: spacing.lg }}>
          <Metricas
            itens={[
              { valor: SINAL_CURTO[session.last_signal_kind], rotulo: 'Último sinal' },
              { valor: tempoRelativo(session.last_signal_at), rotulo: 'Quando' },
              { valor: `${intervalo}h`, rotulo: 'Intervalo' },
            ]}
          />
        </View>

        {pending > 0 && (
          <Text style={styles.queueWarn}>
            {pending} {pending === 1 ? 'ponto guardado' : 'pontos guardados'} offline — enviaremos
            quando houver conexão.
          </Text>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <Rota sessionId={session.id} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Pilula
            label={confirmado ? '✓  Registrado' : 'Estou bem'}
            onPress={confirmar}
            ocupado={confirmando}
          />
        </View>

        {/* O SOS continua exigindo 3 segundos de pressão.
            Ele parece um botão comum e não é: telefone no bolso, na mochila, na
            mão de uma criança. Um SOS acidental aciona a família inteira e é o
            tipo de erro que faz desinstalar o app. */}
        <View style={{ marginTop: spacing.sm + 2 }}>
          <Sobre>Em emergência</Sobre>
          <View style={{ marginTop: 6 }}>
            <PanicButton onTrigger={onSos} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  tripTitle: { ...typo.h2, color: c.text },
  tripSub: { ...typo.caption, color: c.textFaint, marginTop: 1 },
  muted: { ...typo.body, color: c.textMuted, textAlign: 'center', marginTop: 80 },

  empty: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { ...typo.h1, color: c.text, textAlign: 'center' },
  emptyBody: {
    ...typo.body, color: c.textMuted, textAlign: 'center',
    marginTop: spacing.md, lineHeight: 24,
  },
  link: { ...typo.body, color: c.brandLight, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },

  queueWarn: { ...typo.caption, color: c.grace, marginTop: spacing.md, lineHeight: 17 },
});
