import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CHECKIN_PRESETS, travelSessionInput } from '@sentinela/shared';

import { supabase } from '../../src/services/supabase';
import { useSessionStore } from '../../src/stores/session';
import { startBackgroundTracking } from '../../src/services/location/backgroundLocation';
import { colors, spacing, radius, type as typo } from '../../src/theme';

const DEFAULT_HOURS = 24;

export default function NovaViagem() {
  const router = useRouter();
  const { session: active, load } = useSessionStore();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [hours, setHours] = useState<number>(DEFAULT_HOURS);
  const [passive, setPassive] = useState(true);
  const [gps, setGps] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  /**
   * Duas sessões ativas ao mesmo tempo seriam dois Dead Man's Switches
   * concorrendo: dois cronômetros, dois alertas e um painel B2B mostrando a
   * pessoa duas vezes com estados diferentes. O banco não impede — a regra
   * mora aqui e no encerramento explícito abaixo.
   */
  async function closeActive() {
    if (!active) return;
    setSaving(true);
    await supabase
      .from('travel_sessions')
      .update({ status: 'completed', ends_at: new Date().toISOString() })
      .eq('id', active.id);
    await load();
    setSaving(false);
  }

  async function submit() {
    setErrors({});

    const parsed = travelSessionInput.safeParse({
      title: title.trim(),
      destination_label: destination.trim() || undefined,
      checkin_hours: hours,
      passive_checkin_enabled: passive,
      gps_tracking_enabled: gps,
    });

    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      Alert.alert('Sessão expirada', 'Entre novamente para criar uma viagem.');
      return;
    }

    const { data, error } = await supabase
      .from('travel_sessions')
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        destination_label: parsed.data.destination_label ?? null,
        // O Postgres aceita a forma textual; o trigger set_expected_checkin
        // recalcula expected_checkin_at a partir dela.
        checkin_interval: `${parsed.data.checkin_hours} hours`,
        passive_checkin_enabled: parsed.data.passive_checkin_enabled,
        gps_tracking_enabled: parsed.data.gps_tracking_enabled,
        status: 'active',
      })
      .select()
      .single();

    if (error || !data) {
      setSaving(false);
      Alert.alert('Não foi possível criar a viagem', error?.message ?? 'Tente novamente.');
      return;
    }

    await load();

    // A viagem já existe. Se a permissão for negada, o alarme por check-in
    // manual continua valendo — por isso o erro aqui avisa, mas não desfaz.
    if (parsed.data.gps_tracking_enabled) {
      try {
        await startBackgroundTracking(data.id);
      } catch (e) {
        Alert.alert(
          'Viagem criada, rastreamento desligado',
          String(e).includes('background')
            ? 'Precisamos da permissão "Sempre" para localização. Abra Ajustes > Sentinela > Localização e escolha "Sempre" — até lá, só o check-in manual conta como sinal de vida.'
            : 'Não conseguimos ativar o GPS em segundo plano. Você pode tentar de novo na aba Viagem.',
        );
      }
    }

    setSaving(false);
    router.back();
  }

  if (active) {
    return (
      <View style={styles.screen}>
        <View style={styles.blocker}>
          <Text style={styles.blockerTitle}>Você já tem uma viagem ativa</Text>
          <Text style={styles.blockerBody}>
            “{active.title}” está em andamento. Duas viagens ativas ao mesmo tempo criariam dois
            cronômetros independentes — e dois alarmes. Encerre a atual para começar outra.
          </Text>

          <Pressable style={styles.primary} disabled={saving} onPress={closeActive}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryLabel}>Encerrar “{active.title}”</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Voltar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field label="Nome da viagem" error={errors.title}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Sudeste asiático, trilha na Chapada…"
          placeholderTextColor={colors.textFaint}
          maxLength={120}
        />
      </Field>

      <Field label="Destino (opcional)" error={errors.destination_label}>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Vietnã e Camboja"
          placeholderTextColor={colors.textFaint}
          maxLength={160}
        />
      </Field>

      <Text style={styles.sectionLabel}>SE EU FICAR SEM DAR SINAL POR</Text>
      <View style={styles.presets}>
        {CHECKIN_PRESETS.map((p) => {
          const isActive = p.hours === hours;
          return (
            <Pressable
              key={p.hours}
              onPress={() => setHours(p.hours)}
              style={[styles.preset, isActive && styles.presetActive]}
            >
              <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>
                {p.label}
              </Text>
              <Text style={styles.presetHint}>{p.hint}</Text>
            </Pressable>
          );
        })}
      </View>
      {errors.checkin_hours ? <Text style={styles.error}>{errors.checkin_hours}</Text> : null}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Se você ficar <Text style={styles.bold}>{hours}h</Text> sem dar sinal de vida, avisamos{' '}
          <Text style={styles.bold}>só você</Text>. Passadas mais{' '}
          <Text style={styles.bold}>2h</Text> sem resposta, insistimos por push e SMS. Se ainda
          assim nada acontecer em <Text style={styles.bold}>6h</Text>, seus contatos de emergência
          recebem o Dossiê.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>FONTES DE SINAL DE VIDA</Text>

      <Row
        title="GPS em segundo plano"
        subtitle="Ping discreto por deslocamento ou a cada 4h. Menos de 2% de bateria/dia."
        value={gps}
        onChange={setGps}
      />
      <Row
        title="Check-in passivo por deslocamento"
        subtitle="Se o celular se afastar mais de 150 m, o cronômetro zera sozinho."
        value={passive}
        onChange={setPassive}
      />

      {!gps && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Sem GPS, só o botão conta</Text>
          <Text style={styles.noticeText}>
            Com o rastreamento desligado, nenhum sinal automático chega — você precisa lembrar de
            fazer o check-in manual dentro do prazo, ou o alarme dispara.
          </Text>
        </View>
      )}

      <Pressable style={styles.primary} disabled={saving} onPress={submit}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryLabel}>Iniciar viagem</Text>
        )}
      </Pressable>

      <Text style={styles.footnote}>
        Você pode ajustar o intervalo e as fontes de sinal a qualquer momento na aba Viagem.
      </Text>
    </ScrollView>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Row({
  title, subtitle, value, onChange,
}: { title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.surfaceAlt }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  fieldLabel: { ...typo.caption, color: colors.textMuted, marginBottom: spacing.xs, letterSpacing: 0.6 },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  error: { ...typo.caption, color: colors.alert, marginTop: spacing.xs },

  sectionLabel: {
    ...typo.caption, color: colors.textFaint, letterSpacing: 1.2,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  presets: { gap: spacing.sm },
  preset: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  presetActive: { borderColor: colors.brandLight, backgroundColor: colors.surfaceAlt },
  presetLabel: { ...typo.h2, color: colors.textMuted },
  presetLabelActive: { color: colors.text },
  presetHint: { ...typo.caption, color: colors.textFaint, marginTop: 2 },

  summary: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandLight,
  },
  summaryText: { ...typo.small, color: colors.text, lineHeight: 22 },
  bold: { fontWeight: '700', color: colors.brandLight },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { ...typo.body, color: colors.text, fontWeight: '600' },
  rowSub: { ...typo.caption, color: colors.textMuted, marginTop: 2, lineHeight: 17 },

  notice: {
    marginTop: spacing.md,
    backgroundColor: '#3A2A0C',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.grace,
  },
  noticeTitle: { ...typo.small, color: '#FDE68A', fontWeight: '700' },
  noticeText: { ...typo.caption, color: '#FDE68A', marginTop: 4, lineHeight: 18 },

  primary: {
    height: 56,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...typo.body, color: '#fff', fontWeight: '700' },
  link: {
    ...typo.body, color: colors.brandLight, fontWeight: '600',
    textAlign: 'center', marginTop: spacing.lg,
  },
  footnote: { ...typo.caption, color: colors.textFaint, marginTop: spacing.md, lineHeight: 18 },

  blocker: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  blockerTitle: { ...typo.h1, color: colors.text, textAlign: 'center' },
  blockerBody: {
    ...typo.body, color: colors.textMuted, textAlign: 'center',
    marginTop: spacing.md, lineHeight: 24,
  },
});
