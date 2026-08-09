import { useCallback, useState } from 'react';
import { ScrollView, View, Text, Switch, Alert, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  verificarDisponibilidade, bloqueioAtivo, definirBloqueio, pedirBiometria,
  type Disponibilidade,
} from '../../src/services/bloqueio';
import { spacing, type as typo, useColors } from '../../src/theme';
import { Tela, Cartao, Rotulo, Paragrafo, Aviso, Botao } from '../../src/components/Ui';

/**
 * Entrar com biometria.
 *
 * Esta tela já se chamou "Bloqueio do app", e o nome descrevia bem o que ela
 * fazia de errado: tratava a digital como cadeado. Tinha "bloquear agora", o
 * app se re-trancava sozinho ao voltar do segundo plano, e a tela de entrada
 * dizia "Sentinela bloqueado".
 *
 * O papel da biometria aqui é outro: ela SUBSTITUI O LINK MÁGICO. A sessão do
 * Supabase fica salva no aparelho de qualquer forma; a digital só confirma
 * quem está abrindo, uma vez, na abertura. Sem ela o app abre direto — nada
 * fica trancado.
 */
export default function EntrarComBiometria() {
  const c = useColors();
  const [disp, setDisp] = useState<Disponibilidade | null>(null);
  const [ativo, setAtivo] = useState(false);

  /**
   * Recarrega A CADA FOCO, e não uma vez ao montar.
   *
   * O caminho normal é: a pessoa descobre que não tem digital cadastrada, sai
   * para os Ajustes do Android, cadastra e volta. Com `useEffect(..., [])` ela
   * voltava para a mesma tela dizendo que não dá, porque o estado tinha sido
   * lido antes.
   */
  useFocusEffect(
    useCallback(() => {
      verificarDisponibilidade().then(setDisp);
      bloqueioAtivo().then(setAtivo);
    }, []),
  );

  async function alternar(valor: boolean) {
    if (valor) {
      // Confirma ANTES de ligar. Ligar sem testar é como trocar a fechadura
      // sem experimentar a chave — o usuário só descobriria que não funciona
      // ao abrir o app da próxima vez.
      const r = await pedirBiometria('Confirme para usar a biometria ao entrar');
      if (!r.ok) {
        Alert.alert(
          'Não ativamos',
          r.motivo === 'sem_trava_no_aparelho'
            ? 'Este celular não tem digital nem PIN cadastrados. Configure um dos dois no Android primeiro.'
            : 'A confirmação não passou. Tente de novo.',
        );
        return;
      }
    }
    await definirBloqueio(valor);
    setAtivo(valor);
  }

  const indisponivel = disp !== null && !disp.disponivel;

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Rotulo>Como você entra no app</Rotulo>

        <Cartao padding={spacing.md}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.body, color: c.text, fontWeight: '700' }}>
                {disp?.disponivel ? disp.rotulo : 'Biometria'}
              </Text>
              <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 3, lineHeight: 17 }}>
                {disp === null
                  ? 'Verificando o aparelho…'
                  : disp.disponivel
                    ? 'Usar ao abrir o app, no lugar do link por e-mail'
                    : disp.motivo === 'sem_hardware'
                      ? 'Este aparelho não tem sensor biométrico'
                      : 'Nenhuma digital, rosto ou PIN cadastrado no Android'}
              </Text>
            </View>

            <Switch
              value={ativo}
              disabled={!disp?.disponivel}
              onValueChange={alternar}
              trackColor={{ true: c.brand, false: c.surfaceAlt }}
              thumbColor="#fff"
            />
          </View>
        </Cartao>

        <View style={{ height: spacing.sm }} />
        <Paragrafo>
          {ativo
            ? 'Ao abrir o Sentinela, ele pede sua digital e entra direto. Nenhum link por e-mail, e nada é pedido enquanto você está usando o app.'
            : 'Desligado, o app abre direto sempre que a sessão ainda estiver válida. Ligando, ele confirma que é você na abertura.'}
        </Paragrafo>

        {/* Sem trava no aparelho não adianta explicar o produto: o caminho é
            sair para os Ajustes do sistema. O botão leva direto. */}
        {indisponivel && disp.motivo === 'sem_cadastro' ? (
          <>
            <View style={{ height: spacing.md }} />
            <Botao
              label="Abrir Ajustes do Android"
              tom="neutro"
              onPress={() => Linking.openSettings()}
            />
            <View style={{ height: spacing.sm }} />
            <Paragrafo>
              Cadastre uma digital, o rosto ou um PIN em Segurança. Ao voltar, esta tela reconhece
              sozinha.
            </Paragrafo>
          </>
        ) : null}

        {/* Testar sem sair da tela: transforma "liguei e torço para funcionar"
            em "vi funcionando". */}
        {ativo && disp?.disponivel ? (
          <>
            <View style={{ height: spacing.md }} />
            <Botao
              label="Testar agora"
              tom="neutro"
              onPress={async () => {
                const r = await pedirBiometria('Teste — é assim que você vai entrar');
                Alert.alert(
                  r.ok ? 'Funcionou' : 'Não passou',
                  r.ok
                    ? 'É exatamente isto que vai aparecer quando você abrir o app.'
                    : 'A confirmação não passou. Se isso se repetir, desligue a opção antes de fechar o app.',
                );
              }}
            />
          </>
        ) : null}

        <Rotulo>Por que isto existe</Rotulo>
        <Paragrafo>
          Sem biometria, voltar ao app depois de sair da conta exige pedir um link novo por e-mail
          e esperar ele chegar. Com ela, a sessão continua salva e a abertura é imediata.
        </Paragrafo>

        <View style={{ height: spacing.md }} />
        <Aviso tom="info" titulo="Isto não tranca o app">
          A digital é pedida uma vez, na abertura. Trocar para o mapa e voltar não pede de novo —
          num app com botão de pânico, uma tela por cima dele custa mais do que protege.
        </Aviso>

        <View style={{ height: spacing.md }} />
        <Aviso tom="atencao" titulo="Por que não basta digitar o e-mail">
          E-mail não é segredo: está em qualquer lista de contatos. Se ele sozinho abrisse o app,
          qualquer pessoa que soubesse o seu endereço leria seu tipo sanguíneo, suas alergias e
          todo o seu histórico de localização. A biometria dá a mesma conveniência sem essa porta.
        </Aviso>
      </ScrollView>
    </Tela>
  );
}
