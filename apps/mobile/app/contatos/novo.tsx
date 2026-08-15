import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { emergencyContactInput, normalizarTelefone } from '@sentinela/shared';

import { supabase } from '../../src/services/supabase';
import { spacing, radius, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

const CHANNELS = [
  { id: 'email', label: 'E-mail' },
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

type Channel = (typeof CHANNELS)[number]['id'];

export default function NovoContato() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [priority, setPriority] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const telefoneE164 = normalizarTelefone(phone);
  const dicaTelefone = !phone.trim()
    ? 'Pode escrever como você escreveria para alguém: +55 11 97718-3338'
    : telefoneE164 === phone.trim()
      ? 'Pronto para envio internacional'
      : `Vai salvar como ${telefoneE164}`;

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
          placeholderTextColor={c.textFaint}
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
          placeholderTextColor={c.textFaint}
          maxLength={60}
        />
      </Field>

      <Field label="E-mail" error={errors.email}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="ana@email.com"
          placeholderTextColor={c.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          inputMode="email"
        />
      </Field>

      {/* O hint mostra o número JÁ normalizado. Antes ele dizia "formato
          internacional" e recusava +55 11 97718-3338, que é formato
          internacional — a pessoa relia a instrução, via que estava cumprindo,
          e não tinha como saber que o problema era o espaço. Agora o campo
          aceita como se escreve e prova o que vai gravar. */}
      <Field label="Telefone" hint={dicaTelefone} error={errors.phone}>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+55 11 97718-3338"
          placeholderTextColor={c.textFaint}
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
          <ActivityIndicator color={c.bg} />
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
  const styles = useStyles(criarEstilos);
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

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  fieldLabel: { ...typo.caption, color: c.textMuted, marginBottom: spacing.xs, letterSpacing: 0.6 },
  input: {
    height: 52,
    backgroundColor: c.surface,
    borderRadius: radius.md,

    paddingHorizontal: spacing.md,
    color: c.text,
    fontSize: 16,
  },
  hint: { ...typo.caption, color: c.textFaint, marginTop: spacing.xs, lineHeight: 16 },
  error: { ...typo.caption, color: c.alert, marginTop: spacing.xs },

  // Mesmo rótulo minúsculo em caixa alta do resto do app (o `Sobre`), para o
  // formulário não ter uma escala tipográfica só dele.
  sectionLabel: {
    ...typo.eyebrow, color: c.textFaint,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    // Pílula sem contorno, igual ao `Segmentado` da aba Viagem: os dois são o
    // mesmo controle e apareciam com formas diferentes.
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: c.text },
  segmentLabel: { ...typo.small, color: c.textMuted, fontWeight: '600' },
  segmentLabelActive: { color: c.bg, fontWeight: '800' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperBtn: {
    width: 52, height: 52,
    borderRadius: radius.md,
    backgroundColor: c.surface,

    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: { fontSize: 24, color: c.text, lineHeight: 28 },
  stepperValue: { flex: 1, alignItems: 'center' },
  stepperNumber: { ...typo.h1, color: c.text },
  stepperHint: { ...typo.caption, color: c.textFaint },

  notice: {
    marginTop: spacing.lg,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: c.brandLight,
  },
  noticeTitle: { ...typo.small, color: c.text, fontWeight: '700' },
  noticeText: { ...typo.caption, color: c.textMuted, marginTop: 4, lineHeight: 18 },

  primary: {
    height: 56,
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: c.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...typo.body, color: c.bg, fontWeight: '800' },
});
