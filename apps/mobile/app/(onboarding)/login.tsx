import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/services/supabase';
import { spacing, radius, type as typo, useStyles, useColors, type Palette } from '../../src/theme';

export default function Login() {
  const c = useColors();
  const styles = useStyles(criarEstilos);
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
              placeholderTextColor={c.textFaint}
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
              {busy ? <ActivityIndicator color={c.bg} /> : <Text style={styles.primaryLabel}>Receber link de acesso</Text>}
            </Pressable>

            {/* Aqui existiam "Continuar com Google" e "Continuar com Apple"
                com onPress vazio: botões com cara de funcionais que não faziam
                absolutamente nada ao toque. E não era questão de ligar o fio —
                os dois provedores estão desativados no projeto Supabase
                (/auth/v1/settings devolve "google":false, "apple":false), então
                nem com handler eles entrariam.

                Um botão morto na tela de login é pior que a ausência dele: a
                pessoa toca, nada acontece, e a conclusão é que o app está
                quebrado — não que aquela opção não existe.

                Quando o login social entrar, é preciso habilitar o provedor no
                Supabase E lembrar que a App Store exige "Continuar com Apple"
                em qualquer app que ofereça outro login social. */}
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

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, justifyContent: 'space-between' },
  content: { padding: spacing.lg, paddingTop: spacing.xxl },
  title: { ...typo.h1, color: c.text, marginBottom: spacing.xl },
  input: {
    height: 56,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    color: c.text,
    fontSize: 16,
  },
  error: { ...typo.small, color: c.alert, marginTop: spacing.sm },
  primary: {
    height: 56, borderRadius: radius.pill, backgroundColor: c.text,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.md,
  },
  primaryLabel: { ...typo.body, color: c.bg, fontWeight: '800' },
  sentBox: { backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.lg },
  sentTitle: { ...typo.h2, color: c.text },
  sentBody: { ...typo.small, color: c.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  link: { ...typo.small, color: c.brandLight, marginTop: spacing.md, fontWeight: '600' },
  legal: { ...typo.caption, color: c.textFaint, padding: spacing.lg, lineHeight: 17, textAlign: 'center' },
});
