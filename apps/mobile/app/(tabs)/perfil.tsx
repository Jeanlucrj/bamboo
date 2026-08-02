import { ScrollView, View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { stopBackgroundTracking } from '../../src/services/location/backgroundLocation';
import { revokeThisDevice } from '../../src/services/device';
import { spacing, type as typo, useColors, useTheme } from '../../src/theme';
import { Tela, Cartao, Linha, Rotulo } from '../../src/components/Ui';

const NOME_TEMA = { dark: 'Escuro', light: 'Claro', system: 'Sistema' } as const;

export default function PerfilScreen() {
  const router = useRouter();
  const c = useColors();
  const { pref } = useTheme();

  function sair() {
    Alert.alert('Sair da conta?', 'O monitoramento para até você entrar de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          // Ordem importa: parar a task antes de derrubar a sessão. Ao
          // contrário, ela continua acordando e tentando enviar ping com um
          // token que já não vale.
          await stopBackgroundTracking().catch(() => {});
          await revokeThisDevice().catch(() => {});
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Rotulo>Segurança</Rotulo>
        <Cartao>
          <Linha
            glifo="👥" cor={c.brandLight}
            label="Contatos de emergência"
            descricao="Quem é avisado se você sumir"
            onPress={() => router.push('/contatos')}
          />
          <Linha
            glifo="🩺" cor={c.alert}
            label="Dossiê médico"
            descricao="O que o socorrista precisa saber"
            onPress={() => router.push('/contatos/dossie')}
            ultima
          />
        </Cartao>

        <Rotulo>Privacidade</Rotulo>
        <Cartao>
          <Linha
            glifo="👁" cor={c.grace}
            label="Quem acessou meu dossiê"
            onPress={() => router.push('/perfil/acessos')}
          />
          <Linha
            glifo="📦" cor={c.brandLight}
            label="Exportar meus dados"
            onPress={() => router.push('/perfil/exportar')}
          />
          <Linha
            glifo="🗑" label="Apagar dados" destrutivo
            onPress={() => router.push('/perfil/apagar')}
            ultima
          />
        </Cartao>

        <Rotulo>Aplicativo</Rotulo>
        <Cartao>
          <Linha
            glifo="🎨" cor={c.brandLight}
            label="Aparência"
            valor={NOME_TEMA[pref]}
            onPress={() => router.push('/perfil/aparencia')}
          />
          <Linha
            glifo="📍" cor={c.safe}
            label="Permissões de localização"
            onPress={() => router.push('/(onboarding)/permissoes-localizacao')}
          />
          <Linha
            glifo="🔔" cor={c.grace}
            label="Notificações"
            onPress={() => router.push('/(onboarding)/permissoes-notificacao')}
            ultima
          />
        </Cartao>

        <Rotulo>Conta</Rotulo>
        <Cartao>
          <Linha
            glifo="💳" cor={c.brandLight}
            label="Assinatura"
            onPress={() => router.push('/perfil/assinatura')}
          />
          <Linha glifo="🚪" label="Sair" destrutivo onPress={sair} ultima />
        </Cartao>

        <Text
          style={{
            ...typo.caption, color: c.textFaint,
            lineHeight: 18, marginTop: spacing.lg,
          }}
        >
          Seus dados de localização são apagados automaticamente após 24 meses. Os agregados do
          diário de bordo permanecem — eles não permitem reconstituir trajeto.
        </Text>
      </ScrollView>
    </Tela>
  );
}
