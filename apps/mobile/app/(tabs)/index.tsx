import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SIGNAL_LABEL } from '@sentinela/shared';

import { StatusRing } from '../../src/components/StatusRing';
import { CheckinButton } from '../../src/components/CheckinButton';
import { PanicButton } from '../../src/components/PanicButton';
import { useSessionStore } from '../../src/stores/session';
import { queueSize, flushQueue } from '../../src/services/location/pingQueue';
import { spacing, radius, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

/** Home — Dashboard de Segurança. */
export default function HomeScreen() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  const router = useRouter();
  const { session, loading, error, load, checkIn, subscribe } = useSessionStore();
  const [pending, setPending] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => subscribe(), [session?.id]);
  useEffect(() => {
    queueSize().then(setPending);
  }, [session?.last_signal_at]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([load(), flushQueue()]);
    setPending(await queueSize());
    setRefreshing(false);
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
      <SafeAreaView style={styles.screen}>
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
      <SafeAreaView style={styles.screen}>
        <Text style={styles.muted}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brandLight} />
        }
      >
        <Text style={styles.tripTitle}>{session.title}</Text>
        {session.destination_label ? (
          <Text style={styles.tripSub}>{session.destination_label}</Text>
        ) : null}

        <View style={{ marginVertical: spacing.xl }}>
          <StatusRing
            state={session.state}
            lastSignalAt={session.last_signal_at}
            expectedCheckinAt={session.expected_checkin_at}
          />
        </View>

        <CheckinButton onPress={checkIn} />

        <View style={{ height: spacing.md }} />

        <PanicButton onTrigger={onSos} />

        {/* Prova visível de que o check-in passivo funciona. Sem este bloco,
            o usuário não tem como saber que o sistema está vivo. */}
        <View style={styles.signalCard}>
          <Text style={styles.signalLabel}>ÚLTIMO SINAL DE VIDA</Text>
          <Text style={styles.signalValue}>{SIGNAL_LABEL[session.last_signal_kind]}</Text>
          <Text style={styles.signalTime}>{relativeTime(session.last_signal_at)}</Text>

          {pending > 0 && (
            <Text style={styles.queueWarn}>
              {pending} {pending === 1 ? 'ponto guardado' : 'pontos guardados'} offline — enviaremos
              quando houver conexão.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)} dias`;
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  tripTitle: { ...typo.h2, color: c.text, textAlign: 'center' },
  tripSub: { ...typo.small, color: c.textFaint, textAlign: 'center', marginTop: 2 },
  muted: { ...typo.body, color: c.textMuted, textAlign: 'center', marginTop: 80 },

  empty: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { ...typo.h1, color: c.text, textAlign: 'center' },
  emptyBody: {
    ...typo.body, color: c.textMuted, textAlign: 'center',
    marginTop: spacing.md, lineHeight: 24,
  },
  link: { ...typo.body, color: c.brandLight, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },

  signalCard: {
    marginTop: spacing.xl,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
  },
  signalLabel: { ...typo.caption, color: c.textFaint, letterSpacing: 1.2 },
  signalValue: { ...typo.h2, color: c.text, marginTop: 4 },
  signalTime: { ...typo.small, color: c.textMuted, marginTop: 2 },
  queueWarn: { ...typo.caption, color: c.grace, marginTop: spacing.sm, lineHeight: 17 },
});
