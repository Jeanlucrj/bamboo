import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CHECKIN_PRESETS, travelSessionInput, VIAGENS_GRATIS } from '@sentinela/shared';

import { supabase } from '../../src/services/supabase';
import { useSessionStore } from '../../src/stores/session';
import { startBackgroundTracking } from '../../src/services/location/backgroundLocation';
import { spacing, radius, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

const DEFAULT_HOURS = 24;

export default function NovaViagem() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
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

      // A trava do banco chega aqui como texto. Traduzir importa: "limite
      // gratuito atingido" não diz o que fazer, e a pessoa acabou de preencher
      // o formulário inteiro.
      if (String(error?.message ?? '').includes('limite_gratuito_atingido')) {
        Alert.alert(
          'Suas viagens gratuitas acabaram',
          `Você já usou as ${VIAGENS_GRATIS} viagens do teste. Suas viagens anteriores, contatos e dossiê continuam salvos — para iniciar uma nova, assine.`,
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Ver planos', onPress: () => router.replace('/perfil/assinatura') },
          ],
        );
        return;
      }

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
              <ActivityIndicator color={c.bg} />
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
          placeholderTextColor={c.textFaint}
          maxLength={120}
        />
      </Field>

      <Field label="Destino (opcional)" error={errors.destination_label}>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Vietnã e Camboja"
          placeholderTextColor={c.textFaint}
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
          <ActivityIndicator color={c.bg} />
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
  const styles = useStyles(criarEstilos);
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

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  fieldLabel: { ...typo.caption, color: c.textMuted, marginBottom: spacing.xs, letterSpacing: 0.6 },
  input: {
    height: 52,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    color: c.text,
    fontSize: 16,
  },
  error: { ...typo.caption, color: c.alert, marginTop: spacing.xs },

  sectionLabel: {
    ...typo.caption, color: c.textFaint, letterSpacing: 1.2,
    marginTop: spacing.md, marginBottom: spacing.sm,
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

  // Âmbar TINGIDO, e não o marrom #3A2A0C cravado.
  //
  // Aquele marrom era uma cor sólida escolhida para um fundo azul-noite: sobre
  // preto puro ele vira uma mancha suja, e no tema claro sempre foi uma caixa
  // marrom com texto amarelo-pálido — ilegível desde que o tema claro existe.
  // Um âmbar a 14% funciona nos dois, porque compõe com o fundo em vez de
  // ignorá-lo.
  notice: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderRadius: radius.bloco,
    padding: spacing.md,
  },
  noticeTitle: { ...typo.small, color: c.grace, fontWeight: '700' },
  noticeText: { ...typo.caption, color: c.textMuted, marginTop: 4, lineHeight: 18 },

  primary: {
    height: 56,
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: c.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tinta do fundo sobre o botão claro: branco sobre branco sumia no tema claro.
  primaryLabel: { ...typo.body, color: c.bg, fontWeight: '800' },
  link: {
    ...typo.body, color: c.brandLight, fontWeight: '600',
    textAlign: 'center', marginTop: spacing.lg,
  },
  footnote: { ...typo.caption, color: c.textFaint, marginTop: spacing.md, lineHeight: 18 },

  blocker: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  blockerTitle: { ...typo.h1, color: c.text, textAlign: 'center' },
  blockerBody: {
    ...typo.body, color: c.textMuted, textAlign: 'center',
    marginTop: spacing.md, lineHeight: 24,
  },
});
