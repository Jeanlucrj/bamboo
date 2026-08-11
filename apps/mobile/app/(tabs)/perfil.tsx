import { ScrollView, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { stopBackgroundTracking } from '../../src/services/location/backgroundLocation';
import { revokeThisDevice } from '../../src/services/device';
import { Identidade } from '../../src/components/Identidade';
import { versaoEmExecucao } from '../../src/services/atualizacao';
import { spacing, type as typo, useColors, useTheme } from '../../src/theme';
import { Tela, Cartao, Linha, Rotulo } from '../../src/components/Ui';

const NOME_TEMA = { dark: 'Escuro', light: 'Claro', system: 'Sistema' } as const;

export default function PerfilScreen() {
  const router = useRouter();
  const c = useColors();
  const { pref } = useTheme();
  const versao = versaoEmExecucao();

  function sair() {
    Alert.alert(
      'Sair da conta?',
      'A sessão é destruída e voltar exigirá um link novo por e-mail. Se é só para fechar o app, não precisa: basta sair — a biometria abre da próxima vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair mesmo assim',
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
      ],
    );
  }

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Identidade />
        {/* Nome, telefone e país só existiam em /conta no site. Quem instalava
            o app e nunca abria a web não tinha como preencher nenhum deles —
            e o país é o que faz a bandeira aparecer aqui em cima. */}
        <Rotulo>Sua conta</Rotulo>
        <Cartao>
          <Linha
            glifo="🪪" cor={c.brandLight}
            label="Meus dados"
            descricao="Nome, telefone e país de origem"
            onPress={() => router.push('/perfil/dados')}
            ultima
          />
        </Cartao>

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

        <Rotulo>Histórico</Rotulo>
        <Cartao>
          <Linha
            glifo="🧳" cor={c.brandLight}
            label="Minhas viagens"
            descricao="Datas, quilômetros, países e cidades de cada viagem"
            onPress={() => router.push('/viagem/historico')}
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
            glifo="🔒" cor={c.safe}
            label="Entrar com biometria"
            descricao="Abrir o app com a digital, sem link por e-mail"
            onPress={() => router.push('/perfil/bloqueio')}
          />
          <Linha
            glifo="📍" cor={c.safe}
            label="Permissões de localização"
            onPress={() => router.push('/(onboarding)/permissoes-localizacao?origem=ajustes')}
          />
          <Linha
            glifo="🔔" cor={c.grace}
            label="Notificações"
            onPress={() => router.push('/(onboarding)/permissoes-notificacao?origem=ajustes')}
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
          {/* Havia aqui um "Bloquear agora", que trancava o app na hora.
              Removido: biometria neste produto serve para ENTRAR, não para
              fechar a porta com a pessoa do lado de fora. Quem quer sair de
              verdade usa a linha abaixo. */}
          <Linha
            glifo="🚪" label="Sair da conta" destrutivo
            descricao="Destrói a sessão — volta exige link novo"
            onPress={sair} ultima
          />
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

        {/* Identificação do pacote em execução.
            Existe porque "instalei e não mudou nada" é indistinguível de
            "a atualização não chegou" — e sem um número na tela, a única
            saída é adivinhar. `embutido` significa que o app está rodando o
            código que veio no instalador, sem nenhuma atualização aplicada. */}
        <Text
          style={{
            ...typo.caption, color: c.textFaint,
            lineHeight: 18, marginTop: spacing.md, opacity: 0.7,
          }}
        >
          Versão {versao.id}
          {versao.embutido ? ' (do instalador)' : ' (atualizado pelo ar)'} · canal {versao.canal}
        </Text>
      </ScrollView>
    </Tela>
  );
}
