import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { CHECKIN_PRESETS } from '@sentinela/shared';

import { Identidade } from '../../src/components/Identidade';
import { Icone } from '../../src/components/Icone';
import { Sobre, Bloco, Degrau, Segmentado, Pilula, Nota, Assinatura } from '../../src/components/Pecas';
import { useSessionStore } from '../../src/stores/session';
import { useResumoProtecao, listarContatos } from '../../src/hooks/useResumoProtecao';
import { supabase } from '../../src/services/supabase';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingActive,
  sincronizarRastreamento,
} from '../../src/services/location/backgroundLocation';
import { horasDoIntervalo, totalAteContatos } from '../../src/utils/tempo';
import { spacing, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

/** Sessão de Viagem — regras do alarme. */
export default function ViagemScreen() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  const { session, load } = useSessionStore();
  const { resumo } = useResumoProtecao();
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
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Identidade />
        </View>
        <Text style={styles.muted}>Nenhuma viagem ativa.</Text>
      </SafeAreaView>
    );
  }

  const currentHours = horasDoIntervalo(session.checkin_interval);

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

  const graceHours = horasDoIntervalo(session.grace_period);
  const alertHours = horasDoIntervalo(session.alert_delay);
  const dicaAtual = CHECKIN_PRESETS.find((p) => p.hours === currentHours)?.hint;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Identidade />

        <Sobre>Viagem em andamento</Sobre>
        <Text style={styles.h1}>{session.title}</Text>

        {/* SELETOR SEGMENTADO no lugar de cinco cartões empilhados.
            Os cinco presets continuam todos aqui — o que mudou é que eles
            deixaram de ocupar quase 300px de altura. A dica de cada um não se
            perdeu: aparece logo abaixo, referente ao que está selecionado, que
            é a única dica que interessa no momento da leitura. */}
        <Sobre>Se eu sumir por</Sobre>
        <View style={{ marginTop: 8 }}>
          <Segmentado
            opcoes={CHECKIN_PRESETS.map((p) => ({ valor: p.hours, label: `${p.hours}h` }))}
            valor={currentHours}
            onChange={setInterval}
            desabilitado={saving}
          />
        </View>
        {dicaAtual ? (
          <Text style={styles.dica}>{dicaAtual}</Text>
        ) : (
          <Text style={styles.dica}>Intervalo personalizado de {currentHours}h.</Text>
        )}

        {/* A ESCADA DO ALARME.
            Antes isto era um parágrafo de três frases dentro de um bloco, que
            ninguém lia inteiro. Com faixa colorida por degrau e o intervalo em
            caixa alta, a sequência se lê de relance — e as cores são as mesmas
            dos estados na aba Segurança, então verde/âmbar/vermelho querem
            dizer a mesma coisa nas duas telas. */}
        <Sobre>O que acontece, e quando</Sobre>
        <View style={{ marginTop: 4 }}>
          <Degrau
            cor={c.safe}
            quando={`Em ${currentHours}h`}
            titulo="Avisamos só você"
            descricao="Push no seu celular, mais ninguém"
          />
          <Degrau
            cor={c.grace}
            quando={`Mais ${graceHours}h`}
            titulo="Insistimos por push e SMS"
            descricao="Ainda só para você"
          />
          <Degrau
            cor={c.alert}
            quando={`Mais ${alertHours}h`}
            titulo="Seus contatos recebem o Dossiê"
            // Quem exatamente vai receber isso é a pergunta que faz a pessoa
            // hesitar em confiar no produto. Ela merece resposta na mesma tela.
            descricao={`${listarContatos(resumo.contatos)} · com sua última posição`}
          />
        </View>

        {/* O TOTAL, que antes exigia somar três números de cabeça.
            Saber que a família só é acionada depois de 42 horas é o que separa
            confiar do app de ter medo dele. */}
        <View style={{ marginTop: spacing.sm }}>
          <Bloco>
            <Sobre>Sua família só é acionada depois de</Sobre>
            <Text style={styles.total}>
              {totalAteContatos(currentHours + graceHours + alertHours)}
            </Text>
          </Bloco>
        </View>

        <Sobre>Sinais de vida</Sobre>
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
          <View style={{ marginTop: spacing.md }}>
            <Bloco cor={c.alert}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Icone nome="alerta" cor={c.alert} tamanho={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertaTitulo}>O check-in passivo não está valendo</Text>
                  <Text style={styles.alertaTexto}>
                    Ele depende do GPS em segundo plano, que está desligado. Do jeito que está,{' '}
                    <Text style={{ fontWeight: '800' }}>só o check-in manual segura o alarme</Text> —
                    se você esquecer, seus contatos são acionados.
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.md }}>
                <Pilula label="Ligar o GPS em segundo plano" tom="sos" onPress={() => toggleTracking(true)} />
              </View>
            </Bloco>
          </View>
        ) : null}

        {/* Este aviso não é letra miúda: é a diferença entre o usuário confiar
            no app e ser pego de surpresa por um alarme que ele causou. */}
        <View style={{ marginTop: spacing.md }}>
          <Bloco cor={c.grace}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Icone nome="alerta" cor={c.grace} tamanho={18} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertaTitulo, { color: c.grace }]}>
                  Celular parado não conta
                </Text>
                <Text style={[styles.alertaTexto, { color: c.textMuted }]}>
                  Só deslocamento real vale como sinal de vida. Um aparelho esquecido no quarto não
                  prova que você está bem — por isso ele não segura o alarme. Se for passar o dia
                  longe do telefone, faça o check-in manual antes de sair.
                </Text>
              </View>
            </View>
          </Bloco>
        </View>

        {/* ENCERRAR — não existia em lugar nenhum do app.
            O único caminho era tocar em "Nova viagem" e usar o botão que aparece
            no aviso de "você já tem uma viagem ativa": encerrar escondido atrás
            da ação que significa o oposto.
            E não é detalhe de navegação. Uma viagem que não termina continua
            cobrando check-in depois que a pessoa já voltou para casa — e o
            alarme acaba acionando a família de quem está no sofá. Falso positivo
            é o maior risco deste produto. */}
        <Sobre>Quando você voltar</Sobre>
        <View style={{ marginTop: 8 }}>
          {/* Contorno em vez de preenchido: encerrar é destrutivo, mas é também
              a ação NORMAL de quem voltou de viagem. Um botão vermelho sólido no
              fim da tela pareceria perigo e faria a pessoa hesitar — e viagem
              que ninguém encerra é alarme falso esperando para acontecer. */}
          <Pilula
            label={encerrando ? '' : 'Encerrar viagem'}
            tom="perigo"
            ocupado={encerrando}
            onPress={encerrar}
          />
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <Nota>
            Encerrar desliga o monitoramento e o rastreamento. Nada é apagado: a viagem passa para o
            histórico com os quilômetros, países e cidades que você percorreu.
          </Nota>
          <Nota>
            O iOS não garante execução periódica em background. O intervalo de 4h é o alvo — na
            prática o sistema entrega quando pode. Por isso o app combina três fontes: deslocamento,
            abertura do app e check-in manual.
          </Nota>
        </View>

        <Assinatura />
      </ScrollView>
    </SafeAreaView>
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
        trackColor={{ true: c.safe, false: c.surfaceAlt }}
        thumbColor={c.bg}
      />
    </View>
  );
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  h1: { ...typo.h1, color: c.text, marginTop: 4, marginBottom: spacing.lg },
  muted: { ...typo.body, color: c.textMuted, textAlign: 'center', marginTop: 60 },

  dica: { ...typo.caption, color: c.textMuted, marginTop: 8, marginBottom: spacing.lg },
  total: { ...typo.h1, color: c.text, marginTop: 2 },

  // Sem borda inferior: o espaçamento já separa as duas linhas, e uma régua de
  // 1px entre elas devolvia a aparência de formulário que o desenho novo tira.
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowTitle: { ...typo.small, color: c.text, fontWeight: '700' },
  rowSub: { ...typo.caption, color: c.textMuted, marginTop: 2, lineHeight: 16 },

  alertaTitulo: { ...typo.small, color: c.alert, fontWeight: '800' },
  alertaTexto: { ...typo.caption, color: c.textMuted, marginTop: 3, lineHeight: 17 },
});
