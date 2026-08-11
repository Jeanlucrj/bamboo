import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { bandeiraEmoji } from '@sentinela/shared';

import { Identidade } from '../../src/components/Identidade';
import { StatCard } from '../../src/components/StatCard';
import { useTravelStats, useCountryVisits, useTripHistory } from '../../src/hooks/useTravelStats';
import { spacing, radius, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

/**
 * Travel Analytics — o Diário de Bordo.
 *
 * Papel no produto: segurança vende, mas ninguém abre um app de segurança
 * todo dia. Este é o motor de retenção — e o único que gera compartilhamento
 * orgânico. Os números vêm de mv_user_travel_stats, calculada por PostGIS
 * sobre o histórico de GPS e atualizada de hora em hora pelo cron.
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
      <SafeAreaView style={styles.screen}>
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
            <Text style={styles.linhaGlifo}>🧳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.linhaTitulo}>Minhas viagens</Text>
              <Text style={styles.linhaSub}>
                {trips.length === 1 ? '1 viagem' : `${trips.length} viagens`} · datas, km, países e
                cidades de cada uma
              </Text>
            </View>
            <Text style={styles.linhaSeta}>›</Text>
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
            {/* Mapa-múndi: substituir por SVG de projeção equirretangular com
                os países de stats.countries preenchidos. Nada de Mapbox aqui —
                a tela precisa abrir instantaneamente e funcionar offline. */}
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapCount}>{s.countries_count}</Text>
              <Text style={styles.mapLabel}>
                {s.countries_count === 1 ? 'país visitado' : 'países visitados'}
              </Text>
              <Text style={styles.mapFlags}>
                {s.countries.slice(0, 12).map(bandeiraEmoji).join('  ')}
                {s.countries.length > 12 ? `  +${s.countries.length - 12}` : ''}
              </Text>
            </View>

            <View style={styles.grid}>
              <StatCard
                value={formatKm(s.total_km)}
                label="quilômetros percorridos"
                hint={`${s.earth_laps} ${s.earth_laps === 1 ? 'volta' : 'voltas'} ao mundo`}
              />
              <StatCard value={s.cities_count} label="cidades" accent="#A78BFA" />
            </View>

            <View style={styles.grid}>
              <StatCard value={s.days_tracked} label="dias na estrada" accent="#F59E0B" />
              <StatCard
                value={`${s.world_percent}%`}
                label="do mundo"
                hint="de 195 países"
                accent="#38BDF8"
              />
            </View>

            <View style={styles.grid}>
              <StatCard
                value={s.passive_checkins}
                label="check-ins passivos"
                hint="sem você fazer nada"
                accent={c.safe}
              />
              <StatCard value={s.trips_completed} label="viagens concluídas" />
            </View>

            <Text style={styles.sectionTitle}>Timeline</Text>
            {loadingVisits ? (
              <ActivityIndicator color={c.brandLight} />
            ) : (
              visits.slice(0, 30).map((v, i) => (
                <View key={`${v.country_code}-${v.entered_at}-${i}`} style={styles.timelineRow}>
                  <Text style={styles.timelineFlag}>{bandeiraEmoji(v.country_code)}</Text>
                  <View style={{ flex: 1 }}>
                    {/* A cidade no lugar da sigla. "BR" não é um lugar: não
                        distingue três dias em São José dos Campos de três dias
                        atravessando o país. */}
                    <Text style={styles.timelineCountry}>
                      {v.city ?? 'Em trânsito'}
                    </Text>
                    <Text style={styles.timelineDates}>{periodo(v.entered_at, v.left_at)}</Text>
                  </View>
                </View>
              ))
            )}

            {/* A nota de "atualizado em" subiu para o topo, com hora. Aqui no
                pé ela chegava depois de a pessoa já ter desconfiado do número —
                e sem hora, "atualizado 11/08" não distingue 5 minutos de 5
                horas atrás. */}
            <Text style={styles.footnote}>
              Quilômetros contam só deslocamento real entre pontos: menos de 50 m é tremida de GPS
              e não entra. Puxe a tela para baixo para atualizar.
            </Text>
          </>
        )}
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  title: { ...typo.h1, color: c.text },
  subtitle: { ...typo.small, color: c.textMuted, marginBottom: 2 },
  calculado: { ...typo.caption, color: c.textFaint, marginBottom: spacing.md, lineHeight: 16 },

  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { ...typo.body, color: c.textFaint, textAlign: 'center', lineHeight: 24 },

  linhaViagens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  linhaGlifo: { fontSize: 26 },
  linhaTitulo: { ...typo.body, color: c.text, fontWeight: '700' },
  linhaSub: { ...typo.caption, color: c.textMuted, marginTop: 2, lineHeight: 16 },
  linhaSeta: { fontSize: 22, color: c.textFaint },

  mapPlaceholder: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mapCount: { fontSize: 56, fontWeight: '800', color: c.brandLight },
  mapLabel: { ...typo.small, color: c.textMuted },
  mapFlags: { fontSize: 22, marginTop: spacing.md, textAlign: 'center', lineHeight: 32 },

  grid: { flexDirection: 'row', gap: spacing.sm },

  sectionTitle: { ...typo.h2, color: c.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  timelineFlag: { fontSize: 28 },
  timelineCountry: { ...typo.body, color: c.text, fontWeight: '600' },
  timelineDates: { ...typo.caption, color: c.textFaint },

  footnote: { ...typo.caption, color: c.textFaint, marginTop: spacing.lg, textAlign: 'center' },
});
