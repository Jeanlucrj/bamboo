import { useCallback, useState } from 'react';
import { ScrollView, View, Text, Switch, Alert, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  verificarDisponibilidade, bloqueioAtivo, definirBloqueio, pedirBiometria,
  type Disponibilidade,
} from '../../src/services/bloqueio';
import { useBloqueioStore } from '../../src/stores/bloqueio';
import { spacing, type as typo, useColors } from '../../src/theme';
import { Tela, Cartao, Rotulo, Paragrafo, Aviso, Botao } from '../../src/components/Ui';

export default function ConfigBloqueio() {
  const c = useColors();
  const [disp, setDisp] = useState<Disponibilidade | null>(null);
  const [ativo, setAtivo] = useState(false);
  const trancar = useBloqueioStore((s) => s.trancar);

  /**
   * Recarrega A CADA FOCO, e não uma vez ao montar.
   *
   * O caminho normal desta tela é: a pessoa descobre que não tem digital
   * cadastrada, sai para os Ajustes do Android, cadastra e volta. Com
   * `useEffect(..., [])` ela voltava para a mesma tela dizendo que não dá,
   * porque o estado tinha sido lido antes.
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
      // ao ficar trancado do lado de fora.
      const r = await pedirBiometria('Confirme para ativar o bloqueio');
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
        <Rotulo>Bloqueio do app</Rotulo>

        {/* O Switch agora fica DENTRO da linha, alinhado ao rótulo. Antes ele
            morava num bloco solto abaixo do cartão, o que fazia parecer que
            pertencia ao texto seguinte e não à opção. */}
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
                    ? 'Pedir ao abrir o app'
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

        {/* Testar sem sair da tela: é o que transforma "liguei e torço para
            funcionar" em "vi funcionando". */}
        {ativo && disp?.disponivel ? (
          <>
            <View style={{ height: spacing.md }} />
            <Botao
              label="Testar agora"
              tom="neutro"
              onPress={async () => {
                const r = await pedirBiometria('Teste do bloqueio do Sentinela');
                Alert.alert(
                  r.ok ? 'Funcionou' : 'Não passou',
                  r.ok
                    ? 'É exatamente isto que vai aparecer quando você abrir o app.'
                    : 'A confirmação não passou. Se isso se repetir, desligue o bloqueio antes de sair do app.',
                );
              }}
            />
            <View style={{ height: spacing.sm }} />
            <Botao label="Bloquear o app agora" tom="neutro" onPress={trancar} />
          </>
        ) : null}

        <Rotulo>Por que isto existe</Rotulo>
        <Paragrafo>
          Com o bloqueio ligado, sair do app deixa de exigir link novo por e-mail: a sessão
          continua salva e voltar pede só a sua digital, o seu rosto ou o PIN do aparelho.
        </Paragrafo>

        <View style={{ height: spacing.md }} />
        <Aviso tom="info" titulo="Bloquear é diferente de sair">
          Bloquear mantém a sessão no aparelho — é o que você quer no dia a dia. Sair destrói a
          sessão e a volta exige link novo; use quando o celular for trocar de mão.
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
