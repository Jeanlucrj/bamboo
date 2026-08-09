import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Switch, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CHECKIN_PRESETS } from '@sentinela/shared';
import { Identidade } from '../../src/components/Identidade';
import { useSessionStore } from '../../src/stores/session';
import { supabase } from '../../src/services/supabase';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingActive,
  sincronizarRastreamento,
} from '../../src/services/location/backgroundLocation';
import { spacing, radius, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

/** Sessão de Viagem — regras do alarme. */
export default function ViagemScreen() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  const { session, load } = useSessionStore();
  const [tracking, setTracking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Alinha a task do aparelho com o banco toda vez que a aba abre. É aqui que
  // uma viagem criada pelo site liga o rastreamento neste celular — o site
  // marca a coluna e não alcança o aparelho.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      sincronizarRastreamento(session)
        .then(() => isTrackingActive())
        .then((v) => vivo && setTracking(v))
        .catch(() => {});
      return () => {
        vivo = false;
      };
    }, [session?.id, session?.gps_tracking_enabled, session?.status]),
  );

  if (!session) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Nenhuma viagem ativa.</Text>
      </View>
    );
  }

  const currentHours = parseIntervalHours(session.checkin_interval);

  async function setInterval(hours: number) {
    setSaving(true);
    await supabase
      .from('travel_sessions')
      .update({ checkin_interval: `${hours} hours` })
      .eq('id', session!.id);
    await load();
    setSaving(false);
  }

  async function toggleTracking(value: boolean) {
    try {
      if (value) await startBackgroundTracking(session!.id);
      else await stopBackgroundTracking();
      setTracking(value);
      await supabase
        .from('travel_sessions')
        .update({ gps_tracking_enabled: value })
        .eq('id', session!.id);
    } catch (e) {
      const reason = String(e);
      Alert.alert(
        'Permissão necessária',
        reason.includes('background')
          ? 'Precisamos da permissão "Sempre" para localização. Abra Ajustes > Sentinela > Localização e escolha "Sempre".'
          : 'Não conseguimos ativar o rastreamento. Verifique as permissões de localização.',
      );
      setTracking(false);
    }
  }

  function encerrar() {
    Alert.alert(
      'Encerrar esta viagem?',
      `“${session!.title}” sai do monitoramento. O cronômetro para, o GPS em segundo plano desliga e seus contatos deixam de ser acionados. A viagem vai para o histórico com tudo que você percorreu.`,
      [
        { text: 'Continuar viajando', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            setEncerrando(true);
            // A task de background para ANTES do update: deixá-la viva depois
            // de encerrar faria o aparelho continuar enviando ping para uma
            // sessão que não existe mais.
            await stopBackgroundTracking().catch(() => {});

            const { error } = await supabase
              .from('travel_sessions')
              .update({ status: 'completed', ends_at: new Date().toISOString() })
              .eq('id', session!.id);

            setEncerrando(false);
            if (error) {
              Alert.alert('Não foi possível encerrar', error.message);
              return;
            }
            await load();
          },
        },
      ],
    );
  }

  async function togglePassive(value: boolean) {
    await supabase
      .from('travel_sessions')
      .update({ passive_checkin_enabled: value })
      .eq('id', session!.id);
    await load();
  }

  const graceHours = parseIntervalHours(session.grace_period);
  const alertHours = parseIntervalHours(session.alert_delay);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Identidade />
      <Text style={styles.h1}>{session.title}</Text>

      <Text style={styles.sectionLabel}>SE EU FICAR SEM DAR SINAL POR</Text>
      <View style={styles.presets}>
        {CHECKIN_PRESETS.map((p) => {
          const active = p.hours === currentHours;
          return (
            <Pressable
              key={p.hours}
              disabled={saving}
              onPress={() => setInterval(p.hours)}
              style={[styles.preset, active && styles.presetActive]}
            >
              <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{p.label}</Text>
              <Text style={styles.presetHint}>{p.hint}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tradução das regras para linguagem natural. Se o usuário não entende
          exatamente o que vai acontecer, ele não confia — e não paga. */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Se você ficar <Text style={styles.bold}>{currentHours}h</Text> sem dar sinal de vida,
          avisamos <Text style={styles.bold}>só você</Text>.{'\n\n'}
          Passadas mais <Text style={styles.bold}>{graceHours}h</Text> sem resposta, insistimos por
          push e SMS.{'\n\n'}
          Se ainda assim nada acontecer em <Text style={styles.bold}>{alertHours}h</Text>, seus
          contatos de emergência recebem o Dossiê.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>FONTES DE SINAL DE VIDA</Text>

      <Row
        title="GPS em segundo plano"
        subtitle="Ping discreto por deslocamento ou a cada 4h. Menos de 2% de bateria/dia."
        value={tracking}
        onChange={toggleTracking}
      />
      <Row
        title="Check-in passivo por deslocamento"
        subtitle={
          tracking
            ? `Se o celular se afastar mais de ${session.movement_threshold_m} m, o cronômetro zera sozinho.`
            : 'Precisa do GPS em segundo plano para funcionar.'
        }
        value={session.passive_checkin_enabled}
        onChange={togglePassive}
      />

      {/* O aviso mais importante desta tela.
          O check-in passivo DEPENDE dos pings do GPS: "deslocamento conta como
          sinal de vida" só existe se alguém estiver medindo deslocamento. Com o
          GPS desligado, ele fica ligado na chave e inerte na prática — e a
          pessoa acredita estar coberta enquanto o cronômetro corre até o
          alarme acionar a família. É a falha mais cara que este app pode ter,
          e antes ela era invisível: as duas chaves apareciam ligadas. */}
      {session.passive_checkin_enabled && !tracking ? (
        <View style={styles.alerta}>
          <Text style={styles.alertaTitulo}>O check-in passivo não está valendo</Text>
          <Text style={styles.alertaTexto}>
            Ele depende do GPS em segundo plano, que está desligado. Do jeito que está,{' '}
            <Text style={{ fontWeight: '800' }}>só o check-in manual segura o alarme</Text> — se
            você esquecer, seus contatos são acionados.
          </Text>
          <Pressable style={styles.alertaBotao} onPress={() => toggleTracking(true)}>
            <Text style={styles.alertaBotaoLabel}>Ligar o GPS em segundo plano</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Este aviso não é letra miúda: é a diferença entre o usuário confiar
          no app e ser pego de surpresa por um alarme que ele causou. */}
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Celular parado não conta</Text>
        <Text style={styles.noticeText}>
          Só deslocamento real vale como sinal de vida. Um aparelho esquecido no quarto não prova
          que você está bem — por isso ele não segura o alarme. Se for passar o dia longe do
          telefone, faça o check-in manual antes de sair.
        </Text>
      </View>

      {/* ENCERRAR — não existia em lugar nenhum do app.
          O único caminho era tocar em "Nova viagem" e usar o botão que aparece
          no aviso de "você já tem uma viagem ativa": encerrar escondido atrás
          da ação que significa o oposto.
          E não é detalhe de navegação. Uma viagem que não termina continua
          cobrando check-in depois que a pessoa já voltou para casa — e o
          alarme acaba acionando a família de quem está no sofã. Falso positivo
          é o maior risco deste produto. */}
      <Text style={styles.sectionLabel}>QUANDO VOCÊ VOLTAR</Text>
      <Pressable style={styles.encerrar} disabled={encerrando} onPress={encerrar}>
        {encerrando ? (
          <ActivityIndicator color={c.alert} />
        ) : (
          <Text style={styles.encerrarLabel}>Encerrar viagem</Text>
        )}
      </Pressable>
      <Text style={styles.footnote}>
        Encerrar desliga o monitoramento e o rastreamento. Nada é apagado: a viagem passa para o
        histórico com os quilômetros, países e cidades que você percorreu.
      </Text>

      <Text style={styles.footnote}>
        O iOS não garante execução periódica em background. O intervalo de 4h é o alvo — na prática
        o sistema entrega quando pode. Por isso o app combina três fontes: deslocamento, abertura do
        app e check-in manual.
      </Text>
    </ScrollView>
  );
}

function Row({
  title, subtitle, value, onChange,
}: { title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.brand, false: c.surfaceAlt }}
        thumbColor="#fff"
      />
    </View>
  );
}

/** Postgres devolve interval como '24:00:00' ou '1 day 00:00:00'. */
function parseIntervalHours(interval: string): number {
  const days = /(\d+)\s+day/.exec(interval);
  const time = /(\d+):(\d{2}):/.exec(interval);
  return (days ? Number(days[1]) * 24 : 0) + (time ? Number(time[1]) : 0);
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: { ...typo.h1, color: c.text, marginBottom: spacing.lg },
  muted: { ...typo.body, color: c.textMuted, textAlign: 'center', marginTop: 80 },

  sectionLabel: {
    ...typo.caption, color: c.textFaint, letterSpacing: 1.2,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  presets: { gap: spacing.sm },
  preset: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.border,
    padding: spacing.md,
  },
  presetActive: { borderColor: c.brandLight, backgroundColor: c.surfaceAlt },
  presetLabel: { ...typo.h2, color: c.textMuted },
  presetLabelActive: { color: c.text },
  presetHint: { ...typo.caption, color: c.textFaint, marginTop: 2 },

  summary: {
    marginTop: spacing.lg,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: c.brandLight,
  },
  summaryText: { ...typo.small, color: c.text, lineHeight: 22 },
  bold: { fontWeight: '700', color: c.brandLight },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowTitle: { ...typo.body, color: c.text, fontWeight: '600' },
  rowSub: { ...typo.caption, color: c.textMuted, marginTop: 2, lineHeight: 17 },

  notice: {
    marginTop: spacing.lg,
    backgroundColor: '#3A2A0C',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: c.grace,
  },
  noticeTitle: { ...typo.small, color: '#FDE68A', fontWeight: '700' },
  noticeText: { ...typo.caption, color: '#FDE68A', marginTop: 4, lineHeight: 18 },

  footnote: { ...typo.caption, color: c.textFaint, marginTop: spacing.lg, lineHeight: 18 },

  // Contorno em vez de preenchido: encerrar é destrutivo, mas é também a ação
  // NORMAL de quem voltou de viagem. Um botão vermelho sólido no fim da tela
  // pareceria perigo e faria a pessoa hesitar — e viagem que ninguém encerra é
  // alarme falso esperando para acontecer.
  encerrar: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encerrarLabel: { ...typo.body, color: c.alert, fontWeight: '700' },

  // Vermelho, não âmbar: não é dica, é "você acha que está protegido e não
  // está". O bloco de aviso âmbar logo abaixo trata de comportamento esperado.
  alerta: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(208,59,59,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(208,59,59,0.45)',
    padding: spacing.md,
  },
  alertaTitulo: { ...typo.small, color: '#FCA5A5', fontWeight: '800' },
  alertaTexto: { ...typo.caption, color: '#FECACA', marginTop: 4, lineHeight: 18 },
  alertaBotao: {
    marginTop: spacing.md,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: c.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertaBotaoLabel: { ...typo.small, color: '#fff', fontWeight: '800' },
});
