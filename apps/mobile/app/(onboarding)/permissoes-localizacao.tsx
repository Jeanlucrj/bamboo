import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { requestTrackingPermissions } from '../../src/services/location/backgroundLocation';
import { spacing, radius, type as typo, useStyles, type Palette } from '../../src/theme';

/**
 * Tela de PRIMING — precede o prompt nativo.
 *
 * No iOS o diálogo de localização "Sempre" aparece uma única vez na vida do
 * app. Se o usuário negar por não entender o motivo, a única recuperação é
 * mandá-lo aos Ajustes do sistema — e a maioria não vai. Esta tela existe só
 * para que ninguém veja o prompt nativo sem antes entender o porquê.
 */
export default function PermissoesLocalizacao() {
  const styles = useStyles(criarEstilos);
  const router = useRouter();
  const [denied, setDenied] = useState<null | 'foreground' | 'background'>(null);

  /**
   * A mesma tela serve o onboarding e o atalho "Permissões de localização" do
   * Perfil, e o destino depois de conceder não pode ser o mesmo nos dois.
   *
   * Vindo do Perfil, conceder empurrava o usuário para a tela de permissão de
   * notificação e de lá para a Home — ele saía das configurações, atravessava
   * um pedaço de onboarding que já tinha feito e perdia o lugar onde estava.
   */
  const { origem } = useLocalSearchParams<{ origem?: string }>();
  const deAjustes = origem === 'ajustes';

  function seguir() {
    if (deAjustes) router.back();
    else router.push('/(onboarding)/permissoes-notificacao');
  }

  async function ask() {
    const res = await requestTrackingPermissions();
    if (res.granted) {
      seguir();
      return;
    }
    setDenied(res.reason === 'background_denied' ? 'background' : 'foreground');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Sua localização fica invisível{'\n'}— até precisar aparecer</Text>

        <View style={styles.bullets}>
          <Bullet
            icon="🔒"
            title="Ninguém vê onde você está"
            body="Nem sua família, nem a gente. A posição só é revelada se o alarme disparar."
          />
          <Bullet
            icon="🔋"
            title="Menos de 2% de bateria por dia"
            body="Um ping discreto a cada poucas horas ou quando você muda de lugar de verdade."
          />
          <Bullet
            icon="🆘"
            title="É o que permite te encontrar"
            body="Sem localização em segundo plano, seus contatos recebem um alerta sem saber onde procurar."
          />
        </View>

        {denied === 'background' && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>
              Você autorizou apenas "Ao usar o app". Assim o monitoramento para quando a tela
              apaga. Abra Ajustes {'>'} Sentinela {'>'} Localização e escolha{' '}
              <Text style={{ fontWeight: '700' }}>Sempre</Text>.
            </Text>
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={styles.warnLink}>Abrir Ajustes →</Text>
            </Pressable>
          </View>
        )}

        {denied === 'foreground' && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>
              Sem acesso à localização o app não consegue registrar onde você esteve nem acionar
              ajuda. Você pode continuar, mas só com check-in manual.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primary} onPress={ask}>
          <Text style={styles.primaryLabel}>
            {Platform.OS === 'ios' ? 'Permitir localização' : 'Ativar rastreamento'}
          </Text>
        </Pressable>
        <Pressable onPress={seguir}>
          <Text style={styles.skip}>{deAjustes ? 'Voltar' : 'Continuar sem localização'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Bullet({ icon, title, body }: { icon: string; title: string; body: string }) {
  const styles = useStyles(criarEstilos);
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.bulletTitle}>{title}</Text>
        <Text style={styles.bulletBody}>{body}</Text>
      </View>
    </View>
  );
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, justifyContent: 'space-between' },
  content: { padding: spacing.lg, paddingTop: spacing.xxl },
  emoji: { fontSize: 56, textAlign: 'center' },
  title: {
    ...typo.h1, color: c.text, textAlign: 'center',
    marginTop: spacing.lg, lineHeight: 36,
  },
  bullets: { marginTop: spacing.xl, gap: spacing.lg },
  bullet: { flexDirection: 'row', gap: spacing.md },
  bulletIcon: { fontSize: 24 },
  bulletTitle: { ...typo.body, color: c.text, fontWeight: '600' },
  bulletBody: { ...typo.small, color: c.textMuted, marginTop: 2, lineHeight: 20 },

  warn: {
    marginTop: spacing.lg,
    backgroundColor: '#3A2A0C',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: c.grace,
  },
  warnText: { ...typo.small, color: '#FDE68A', lineHeight: 20 },
  warnLink: { ...typo.small, color: c.grace, fontWeight: '700', marginTop: spacing.sm },

  footer: { padding: spacing.lg, gap: spacing.md },
  primary: {
    height: 56, borderRadius: radius.md, backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryLabel: { ...typo.body, color: '#fff', fontWeight: '700' },
  skip: { ...typo.small, color: c.textFaint, textAlign: 'center' },
});
