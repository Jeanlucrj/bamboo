import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { bandeiraEmoji } from '@sentinela/shared';

import { Identidade } from '../../src/components/Identidade';
import { Icone } from '../../src/components/Icone';
import { Sobre, Metricas, Nota, Assinatura } from '../../src/components/Pecas';
import { GraficoBarras, Medalha, corDe } from '../../src/components/Grafico';
import { useTravelStats, useCountryVisits, useTripHistory } from '../../src/hooks/useTravelStats';
import { spacing, radius, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

/**
 * Travel Analytics — o Diário de Bordo.
 *
 * Papel no produto: segurança vende, mas ninguém abre um app de segurança
 * todo dia. Este é o motor de retenção — e o único que gera compartilhamento
 * orgânico. Os números vêm de mv_user_travel_stats, calculada por PostGIS
 * sobre o histórico de GPS e atualizada de hora em hora pelo cron.
 *
 * No desenho novo os quilômetros viram o herói da tela. Antes eles dividiam
 * espaço igualmente com "13 dias" dentro de seis cartões idênticos — e o
 * número que a pessoa quer mostrar para os amigos ficava do mesmo tamanho da
 * contagem de dias.
 */
export default function DiarioScreen() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  const router = useRouter();
  const { stats, loading, recarregar: recarregarStats } = useTravelStats();
  const { visits, loading: loadingVisits, recarregar: recarregarVisitas } = useCountryVisits();
  const { trips, recarregar: recarregarViagens } = useTripHistory();
  const [atualizando, setAtualizando] = useState(false);

  async function puxarParaAtualizar() {
    setAtualizando(true);
    await Promise.all([recarregarStats(), recarregarVisitas(), recarregarViagens()]);
    setAtualizando(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 80 }} color={c.brandLight} />
      </SafeAreaView>
    );
  }

  /**
   * Toda coluna de mv_user_travel_stats é nulável para o Postgres: a MV agrega
   * sobre LEFT JOINs, então quem nunca gerou um ping tem null em tudo. Nesta
   * tela "sem dado" e "zero" são a mesma coisa, e normalizar uma vez aqui evita
   * `?? 0` espalhado por uma dúzia de pontos do JSX.
   */
  const s = stats && {
    countries_count: stats.countries_count ?? 0,
    countries: stats.countries ?? [],
    total_km: stats.total_km ?? 0,
    earth_laps: stats.earth_laps ?? 0,
    cities_count: stats.cities_count ?? 0,
    days_tracked: stats.days_tracked ?? 0,
    world_percent: stats.world_percent ?? 0,
    passive_checkins: stats.passive_checkins ?? 0,
    trips_completed: stats.trips_completed ?? 0,
  };

  const hasData = s && s.days_tracked > 0;

  // Quilômetros por viagem, da mais antiga para a mais nova. `get_my_trip_history`
  // devolve a mais recente primeiro, e um gráfico que anda para trás no tempo
  // faz a barra destacada — a viagem atual — aparecer à esquerda, onde o olho
  // lê "começo".
  const barras = [...trips]
    .filter((t) => (t.km ?? 0) > 0)
    .reverse()
    .slice(-9)
    .map((t) => ({ rotulo: mesCurto(t.starts_at), valor: t.km ?? 0 }));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={puxarParaAtualizar}
            tintColor={c.brandLight}
          />
        }
      >
        <Identidade />
        <Text style={styles.title}>Diário de bordo</Text>
        <Text style={styles.subtitle}>
          Escrito sozinho a partir do seu GPS e dos seus check-ins.
        </Text>

        {/* Quando os números foram calculados, no TOPO e não no rodapé.
            Países, cidades e quilômetros vêm de uma tabela recalculada de hora
            em hora — somar distância sobre todos os pings a cada abertura seria
            inviável. Sem esta linha visível, um ping recente que ainda não
            entrou na conta parece número errado, não número de uma hora atrás. */}
        {stats?.refreshed_at ? (
          <Text style={styles.calculado}>
            Números calculados {fmtHora(stats.refreshed_at)} · recalculados a cada hora
          </Text>
        ) : null}

        {/* Fora do `hasData`: as viagens existem independentemente de haver
            ping de GPS. Antes, quem tivesse viajado com o rastreamento
            desligado via só "seus números aparecem depois da primeira viagem"
            — tendo feito várias. E não havia caminho nenhum, em tela alguma,
            para a lista das viagens em si. */}
        {trips.length > 0 ? (
          <Pressable style={styles.linhaViagens} onPress={() => router.push('/viagem/historico')}>
            <Icone nome="mala" cor={c.brandLight} tamanho={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linhaTitulo}>Minhas viagens</Text>
              <Text style={styles.linhaSub}>
                datas, km, países e cidades de cada uma
              </Text>
            </View>
            <Text style={styles.linhaValor}>{trips.length}</Text>
            <Icone nome="seta" cor={c.textFaint} tamanho={16} />
          </Pressable>
        ) : null}

        {!hasData ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {trips.length
                ? 'Ainda não recebemos pontos de GPS suficientes para calcular países e quilômetros. Abra "Minhas viagens" acima para ver o que já existe.'
                : 'Seus números aparecem aqui depois da primeira viagem monitorada.'}
            </Text>
          </View>
        ) : (
          <>
            {/* O HERÓI: o número que a pessoa manda print para os amigos. */}
            <View style={{ marginTop: spacing.lg }}>
              {stats?.first_ping_at ? <Sobre>Desde {fmtData(stats.first_ping_at)}</Sobre> : null}
              <Text style={styles.heroi} adjustsFontSizeToFit numberOfLines={1}>
                {formatKm(s.total_km)}
                <Text style={styles.heroiUnidade}> km</Text>
              </Text>
              <Text style={styles.heroiSub}>
                {s.earth_laps >= 0.01
                  ? `${s.earth_laps.toLocaleString('pt-BR')} ${s.earth_laps === 1 ? 'volta' : 'voltas'} ao mundo`
                  : 'a caminho da primeira volta ao mundo'}
              </Text>
            </View>

            {/* As seis estatísticas continuam todas aqui — o que mudou é que
                elas deixaram de ser seis cartões com borda do mesmo peso do
                herói, e viraram uma grade alinhada onde o valor manda e o
                rótulo serve. */}
            <View style={{ marginTop: spacing.md }}>
              <Metricas
                itens={[
                  { valor: s.countries_count, rotulo: 'Países' },
                  { valor: s.cities_count, rotulo: 'Cidades' },
                  { valor: s.days_tracked, rotulo: 'Dias na estrada' },
                  { valor: `${s.world_percent}%`, rotulo: 'Do mundo' },
                  { valor: s.passive_checkins, rotulo: 'Check-ins passivos', cor: c.safe },
                  { valor: s.trips_completed, rotulo: 'Viagens concluídas' },
                ]}
              />
              <Nota>
                &ldquo;Do mundo&rdquo; é sobre 195 países. Check-in passivo é deslocamento detectado
                pelo GPS ou abertura do app — quanto maior essa conta, menos o Sentinela precisou da
                sua atenção.
              </Nota>
            </View>

            {barras.length > 1 ? (
              <View style={{ marginTop: spacing.xl }}>
                <Sobre>Quilômetros por viagem</Sobre>
                <View style={{ marginTop: 8 }}>
                  <GraficoBarras dados={barras} />
                </View>
              </View>
            ) : null}

            {/* O PASSAPORTE. Era uma fileira de bandeirinhas dentro de um cartão
                cinza; virou grade de medalhas com cor estável por país. */}
            {s.countries.length > 0 ? (
              <View style={{ marginTop: spacing.xl }}>
                <Sobre>Passaporte</Sobre>
                <View style={styles.medalhas}>
                  {s.countries.map((p) => (
                    <View key={p} style={{ alignItems: 'center', gap: 4 }}>
                      <Medalha pais={p} tamanho={62} />
                      <Text style={styles.medalhaBandeira}>{bandeiraEmoji(p)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: spacing.xl }}>
              <Sobre>Onde você esteve</Sobre>
              {loadingVisits ? (
                <ActivityIndicator color={c.brandLight} style={{ marginTop: spacing.md }} />
              ) : (
                <View style={{ marginTop: 4 }}>
                  {visits.slice(0, 30).map((v, i) => (
                    <View key={`${v.country_code}-${v.entered_at}-${i}`} style={styles.timelineRow}>
                      {/* Faixa colorida por viagem, como o calendário de treinos
                          da referência. Duas estadas na mesma cidade em viagens
                          diferentes deixam de parecer a mesma coisa. */}
                      <View
                        style={[
                          styles.faixa,
                          { backgroundColor: corDe(v.trip_title ?? v.country_code) },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        {/* A cidade no lugar da sigla. "BR" não é um lugar: não
                            distingue três dias em São José dos Campos de três
                            dias atravessando o país. */}
                        <Text style={styles.timelineCidade}>{v.city ?? 'Em trânsito'}</Text>
                        <Text style={styles.timelineDatas}>
                          {bandeiraEmoji(v.country_code)} {periodo(v.entered_at, v.left_at)}
                        </Text>
                        {/* O nome da viagem é o que responde "cadê a de hoje?".
                            Sem ele, duas estadas na mesma cidade em viagens
                            diferentes ficam visualmente idênticas. */}
                        {v.trip_title ? (
                          <Text style={styles.timelineViagem} numberOfLines={1}>
                            {v.trip_title}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* A nota de "atualizado em" subiu para o topo, com hora. Aqui no
                pé ela chegava depois de a pessoa já ter desconfiado do número —
                e sem hora, "atualizado 11/08" não distingue 5 minutos de 5
                horas atrás. */}
            <View style={{ marginTop: spacing.xl }}>
              <Nota>
                Quilômetros contam só deslocamento real entre pontos: menos de 50 m é tremida de GPS
                e não entra. Puxe a tela para baixo para atualizar.
              </Nota>
            </View>
          </>
        )}

        <Assinatura />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
  return String(Math.round(km));
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

/** "AGO 11" — curto o bastante para caber na ponta de um gráfico. */
function mesCurto(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} ${d.getDate()}`;
}

/**
 * Período de uma parada, no formato mais curto que ainda informa.
 *
 * Antes era `fmt(entrou) — fmt(saiu)`, que numa parada do mesmo dia repetia a
 * data duas vezes ("08 de ago — 08 de ago") e escondia a informação útil, que
 * é a hora. E numa parada em curso o "fim" parecia data de saída, dando a
 * impressão de coisa encerrada — foi o que fez a timeline parecer travada no
 * dia 8 enquanto ela ia até hoje.
 */
function periodo(entrou: string, saiu: string): string {
  const a = new Date(entrou);
  const b = new Date(saiu);
  const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Ainda ali: nenhum ping novo em menos de 5 h significa que a parada segue —
  // o app só envia a cada 4 h quando o aparelho está parado.
  const emCurso = Date.now() - b.getTime() < 5 * 60 * 60 * 1000;

  if (a.toDateString() === b.toDateString()) {
    return emCurso
      ? `${fmt(entrou)}, desde ${hora(a)}`
      : `${fmt(entrou)}, ${hora(a)} — ${hora(b)}`;
  }
  return emCurso ? `desde ${fmt(entrou)}` : `${fmt(entrou)} — ${fmt(saiu)}`;
}

/** Com hora, porque "hoje" sozinho não diz se foi há 5 minutos ou há 50. */
function fmtHora(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return hoje ? `hoje às ${hora}` : `${fmt(iso)} às ${hora}`;
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typo.h1, color: c.text },
  subtitle: { ...typo.caption, color: c.textMuted, marginTop: 2 },
  calculado: { ...typo.caption, fontSize: 11, color: c.textFaint, marginTop: 3, lineHeight: 15 },

  empty: { paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  emptyText: { ...typo.small, color: c.textMuted, textAlign: 'center', lineHeight: 22 },

  linhaViagens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
    borderRadius: radius.bloco,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  linhaTitulo: { ...typo.small, color: c.text, fontWeight: '700' },
  linhaSub: { ...typo.caption, fontSize: 11, color: c.textMuted, marginTop: 1 },
  linhaValor: { ...typo.small, color: c.textMuted, fontWeight: '700' },

  heroi: { ...typo.hero, color: c.text, marginTop: 4, fontVariant: ['tabular-nums'] },
  heroiUnidade: { fontSize: 22, fontWeight: '700', color: c.textMuted, letterSpacing: 0 },
  heroiSub: { ...typo.caption, color: c.textMuted, marginTop: 2 },

  medalhas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  medalhaBandeira: { fontSize: 13 },

  // Sem régua horizontal entre as linhas: a faixa colorida à esquerda já
  // agrupa, e um divisor a cada item devolvia a cara de tabela.
  timelineRow: { flexDirection: 'row', gap: spacing.sm + 2, paddingVertical: 9 },
  faixa: { width: 4, borderRadius: radius.pill },
  timelineCidade: { ...typo.small, color: c.text, fontWeight: '700' },
  timelineDatas: { ...typo.caption, fontSize: 11, color: c.textFaint, marginTop: 1 },
  timelineViagem: { ...typo.caption, fontSize: 11, color: c.brandLight, marginTop: 2, fontWeight: '700' },
});
