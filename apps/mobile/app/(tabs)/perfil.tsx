import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { stopBackgroundTracking } from '../../src/services/location/backgroundLocation';
import { colors, spacing, radius, type as typo } from '../../src/theme';

export default function PerfilScreen() {
  const router = useRouter();

  async function signOut() {
    await stopBackgroundTracking(); // nunca deixe a task rodando após logout
    await supabase.auth.signOut();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Section title="Segurança">
        <Item label="Contatos de emergência" onPress={() => router.push('/contatos')} />
        <Item label="Dossiê médico" onPress={() => router.push('/contatos/dossie')} />
      </Section>

      <Section title="Privacidade">
        <Item label="Quem acessou meu dossiê" onPress={() => router.push('/perfil/acessos')} />
        <Item label="Exportar meus dados" onPress={() => router.push('/perfil/exportar')} />
        <Item label="Apagar histórico de localização" destructive onPress={() => router.push('/perfil/apagar')} />
      </Section>

      <Section title="Conta">
        <Item label="Assinatura" onPress={() => router.push('/perfil/assinatura')} />
        <Item label="Sair" destructive onPress={signOut} />
      </Section>

      <Text style={styles.footnote}>
        Seus dados de localização são apagados automaticamente após 24 meses. Os agregados do
        diário de bordo permanecem.
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Item({
  label, onPress, destructive,
}: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <Text style={[styles.itemLabel, destructive && { color: colors.alert }]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  sectionTitle: { ...typo.caption, color: colors.textFaint, letterSpacing: 1.2, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLabel: { ...typo.body, color: colors.text },
  chevron: { ...typo.h2, color: colors.textFaint },
  footnote: { ...typo.caption, color: colors.textFaint, lineHeight: 18, marginTop: spacing.md },
});
