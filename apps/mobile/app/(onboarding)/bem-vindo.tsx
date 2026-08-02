import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, radius, type as typo, useStyles, type Palette } from '../../src/theme';

export default function BemVindo() {
  const styles = useStyles(criarEstilos);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* ScrollView, não View: com `justifyContent: space-between` num flex
          fixo, o conteúdo de três passos estourava a altura em telas menores e
          empurrava o botão "Começar" para fora — o usuário via a explicação e
          nenhuma forma de seguir adiante. */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>SENTINELA</Text>

        <Text style={styles.headline}>
          Se algo acontecer com você lá fora,{'\n'}alguém vai saber.
        </Text>
        <Text style={styles.sub}>Automaticamente.</Text>

        <View style={styles.steps}>
          <Step n="1" title="Você define o combinado"
            body='"Se eu ficar 24h sem dar sinal de vida, algo está errado."' />
          <Step n="2" title="A gente observa em silêncio"
            body="Um story, um ping de GPS, abrir o app — tudo conta como sinal de vida." />
          <Step n="3" title="Se o silêncio passar do limite, agimos"
            body="Primeiro avisamos você. Só depois seus contatos recebem o Dossiê." />
        </View>
      </ScrollView>

      {/* Fora do ScrollView: o botão fica ancorado no rodapé e continua
          alcançável sem depender de o usuário rolar até o fim. */}
      <View style={styles.footer}>
        <Pressable style={styles.primary} onPress={() => router.push('/(onboarding)/login')}>
          <Text style={styles.primaryLabel}>Começar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  const styles = useStyles(criarEstilos);
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNum}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  logo: { ...typo.caption, color: c.brandLight, letterSpacing: 4, textAlign: 'center' },
  headline: {
    ...typo.h1, fontSize: 30, color: c.text, textAlign: 'center',
    marginTop: spacing.xl, lineHeight: 40,
  },
  sub: { ...typo.h2, color: c.brandLight, textAlign: 'center', marginTop: spacing.xs },
  steps: { marginTop: spacing.xxl, gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { ...typo.small, color: c.brandLight, fontWeight: '700' },
  stepTitle: { ...typo.body, color: c.text, fontWeight: '600' },
  stepBody: { ...typo.small, color: c.textMuted, marginTop: 2, lineHeight: 20 },
  footer: { padding: spacing.lg },
  primary: {
    height: 56, borderRadius: radius.md, backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryLabel: { ...typo.body, color: '#fff', fontWeight: '700' },
});
