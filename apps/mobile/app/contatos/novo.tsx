import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { emergencyContactInput } from '@sentinela/shared';

import { supabase } from '../../src/services/supabase';
import { colors, spacing, radius, type as typo } from '../../src/theme';

const CHANNELS = [
  { id: 'email', label: 'E-mail' },
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

type Channel = (typeof CHANNELS)[number]['id'];

export default function NovoContato() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [priority, setPriority] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    setErrors({});

    const parsed = emergencyContactInput.safeParse({
      full_name: fullName.trim(),
      relationship: relationship.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      preferred_channel: channel,
      priority,
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
      Alert.alert('Sessão expirada', 'Entre novamente para cadastrar contatos.');
      return;
    }

    const { error } = await supabase.from('emergency_contacts').insert({
      user_id: user.id,
      full_name: parsed.data.full_name,
      relationship: parsed.data.relationship ?? null,
      // String vazia vira null: a constraint contact_needs_a_channel exige que
      // pelo menos um dos dois NÃO seja nulo, e '' passaria pela checagem sem
      // ser um canal utilizável.
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      preferred_channel: parsed.data.preferred_channel,
      locale: parsed.data.locale,
      priority: parsed.data.priority,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Não foi possível salvar', error.message);
      return;
    }

    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field label="Nome completo" error={errors.full_name}>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ana Souza"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="words"
          maxLength={120}
        />
      </Field>

      <Field label="Relação (opcional)" error={errors.relationship}>
        <TextInput
          style={styles.input}
          value={relationship}
          onChangeText={setRelationship}
          placeholder="Mãe, irmão, amiga…"
          placeholderTextColor={colors.textFaint}
          maxLength={60}
        />
      </Field>

      <Field label="E-mail" error={errors.email}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="ana@email.com"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          inputMode="email"
        />
      </Field>

      <Field
        label="Telefone"
        hint="Formato internacional, com código do país: +5511999999999"
        error={errors.phone}
      >
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+5511999999999"
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
      </Field>

      <Text style={styles.sectionLabel}>COMO AVISAR ESTA PESSOA</Text>
      <View style={styles.segmented}>
        {CHANNELS.map((c) => {
          const isActive = c.id === channel;
          return (
            <Pressable
              key={c.id}
              onPress={() => setChannel(c.id)}
              style={[styles.segment, isActive && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {channel !== 'email' && !phone.trim() ? (
        <Text style={styles.error}>SMS e WhatsApp exigem telefone.</Text>
      ) : null}

      <Text style={styles.sectionLabel}>ORDEM DE ACIONAMENTO</Text>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepperBtn}
          onPress={() => setPriority((p) => Math.max(1, p - 1))}
        >
          <Text style={styles.stepperSign}>−</Text>
        </Pressable>
        <View style={styles.stepperValue}>
          <Text style={styles.stepperNumber}>{priority}</Text>
          <Text style={styles.stepperHint}>
            {priority === 1 ? 'avisado primeiro' : `${priority}º a ser avisado`}
          </Text>
        </View>
        <Pressable
          style={styles.stepperBtn}
          onPress={() => setPriority((p) => Math.min(10, p + 1))}
        >
          <Text style={styles.stepperSign}>+</Text>
        </Pressable>
      </View>
      {errors.priority ? <Text style={styles.error}>{errors.priority}</Text> : null}

      {/* Sem isso o contato descobre que é contato de emergência no pior
          momento possível — recebendo um alerta de que alguém sumiu. */}
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Avise essa pessoa</Text>
        <Text style={styles.noticeText}>
          Ela só será acionada se você ficar sem dar sinal de vida por horas além do combinado.
          Vale mandar uma mensagem contando — quem não sabe que é contato de emergência costuma
          ignorar a notificação achando que é golpe.
        </Text>
      </View>

      <Pressable style={styles.primary} disabled={saving} onPress={submit}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryLabel}>Salvar contato</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label, hint, error, children,
}: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
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
  hint: { ...typo.caption, color: colors.textFaint, marginTop: spacing.xs, lineHeight: 16 },
  error: { ...typo.caption, color: colors.alert, marginTop: spacing.xs },

  sectionLabel: {
    ...typo.caption, color: colors.textFaint, letterSpacing: 1.2,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.brand },
  segmentLabel: { ...typo.small, color: colors.textMuted, fontWeight: '600' },
  segmentLabelActive: { color: '#fff' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperBtn: {
    width: 52, height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: { fontSize: 24, color: colors.text, lineHeight: 28 },
  stepperValue: { flex: 1, alignItems: 'center' },
  stepperNumber: { ...typo.h1, color: colors.text },
  stepperHint: { ...typo.caption, color: colors.textFaint },

  notice: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandLight,
  },
  noticeTitle: { ...typo.small, color: colors.text, fontWeight: '700' },
  noticeText: { ...typo.caption, color: colors.textMuted, marginTop: 4, lineHeight: 18 },

  primary: {
    height: 56,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...typo.body, color: '#fff', fontWeight: '700' },
});
