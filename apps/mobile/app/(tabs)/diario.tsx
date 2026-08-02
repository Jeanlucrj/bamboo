import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '../../src/components/StatCard';
import { useTravelStats, useCountryVisits } from '../../src/hooks/useTravelStats';
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
  const { stats, loading } = useTravelStats();
  const { visits, loading: loadingVisits } = useCountryVisits();

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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Diário de bordo</Text>
        <Text style={styles.subtitle}>
          Escrito sozinho a partir do seu GPS e dos seus check-ins.
        </Text>

        {!hasData ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Seus números aparecem aqui depois da primeira viagem monitorada.
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
                {s.countries.slice(0, 12).map(flagEmoji).join('  ')}
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
                  <Text style={styles.timelineFlag}>{flagEmoji(v.country_code)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineCountry}>{v.country_code}</Text>
                    <Text style={styles.timelineDates}>
                      {fmt(v.entered_at)} — {fmt(v.left_at)}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.footnote}>
              Atualizado {stats.refreshed_at ? fmt(stats.refreshed_at) : '—'}. Os números são
              recalculados de hora em hora.
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

/** Converte ISO-3166-1 alpha-2 no emoji de bandeira via Regional Indicators. */
function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  title: { ...typo.h1, color: c.text },
  subtitle: { ...typo.small, color: c.textMuted, marginBottom: spacing.md },

  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { ...typo.body, color: c.textFaint, textAlign: 'center', lineHeight: 24 },

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
