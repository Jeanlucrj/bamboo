import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, radius, type as typo } from '../../src/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      // O `?next=/` não é decorativo: o template de e-mail monta o link como
      // `{{ .RedirectTo }}&token_hash=...`, e sem uma query já existente o `&`
      // produziria `sentinela://callback&token_hash=...` — URL malformada que
      // o SO não entrega a ninguém.
      options: { emailRedirectTo: 'sentinela://callback?next=/' },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Entrar</Text>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentTitle}>Link enviado</Text>
            <Text style={styles.sentBody}>
              Abra o e-mail em <Text style={{ fontWeight: '700' }}>{email}</Text> e toque no link
              para entrar. Ele expira em 1 hora.
            </Text>
            <Pressable onPress={() => setSent(false)}>
              <Text style={styles.link}>Usar outro e-mail</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textFaint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primary, (!email || busy) && { opacity: 0.5 }]}
              disabled={!email || busy}
              onPress={sendMagicLink}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryLabel}>Receber link de acesso</Text>}
            </Pressable>

            <Text style={styles.divider}>ou</Text>

            {/* Login com Apple é OBRIGATÓRIO na App Store se houver
                qualquer outro login social. Não é opcional. */}
            {Platform.OS === 'ios' && (
              <Pressable style={styles.social} onPress={() => {/* expo-apple-authentication */}}>
                <Text style={styles.socialLabel}> Continuar com Apple</Text>
              </Pressable>
            )}
            <Pressable style={styles.social} onPress={() => {/* expo-auth-session + Google */}}>
              <Text style={styles.socialLabel}>Continuar com Google</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.legal}>
        Ao continuar você concorda com os Termos de Uso e a Política de Privacidade. Coletamos
        localização em segundo plano — você pode desativar e apagar tudo a qualquer momento.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between' },
  content: { padding: spacing.lg, paddingTop: spacing.xxl },
  title: { ...typo.h1, color: colors.text, marginBottom: spacing.xl },
  input: {
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  error: { ...typo.small, color: colors.alert, marginTop: spacing.sm },
  primary: {
    height: 56, borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.md,
  },
  primaryLabel: { ...typo.body, color: '#fff', fontWeight: '700' },
  divider: { ...typo.caption, color: colors.textFaint, textAlign: 'center', marginVertical: spacing.md },
  social: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  socialLabel: { ...typo.body, color: colors.text, fontWeight: '600' },
  sentBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
  sentTitle: { ...typo.h2, color: colors.text },
  sentBody: { ...typo.small, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  link: { ...typo.small, color: colors.brandLight, marginTop: spacing.md, fontWeight: '600' },
  legal: { ...typo.caption, color: colors.textFaint, padding: spacing.lg, lineHeight: 17, textAlign: 'center' },
});
