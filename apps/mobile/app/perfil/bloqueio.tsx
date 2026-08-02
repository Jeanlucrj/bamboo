import { useEffect, useState } from 'react';
import { ScrollView, View, Switch, Alert } from 'react-native';
import {
  verificarDisponibilidade, bloqueioAtivo, definirBloqueio, pedirBiometria,
  type Disponibilidade,
} from '../../src/services/bloqueio';
import { spacing, useColors } from '../../src/theme';
import { Tela, Cartao, Linha, Rotulo, Paragrafo, Aviso } from '../../src/components/Ui';

const NOME = {
  facial: 'Reconhecimento facial',
  digital: 'Digital',
  iris: 'Íris',
  outro: 'Biometria',
} as const;

export default function ConfigBloqueio() {
  const c = useColors();
  const [disp, setDisp] = useState<Disponibilidade | null>(null);
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    verificarDisponibilidade().then(setDisp);
    bloqueioAtivo().then(setAtivo);
  }, []);

  async function alternar(valor: boolean) {
    if (valor) {
      // Confirma ANTES de ligar. Ligar sem testar é como trocar a fechadura
      // sem experimentar a chave — o usuário só descobriria que não funciona
      // ao ficar trancado do lado de fora.
      const ok = await pedirBiometria('Confirme para ativar o bloqueio');
      if (!ok) {
        Alert.alert('Não ativamos', 'A confirmação não passou. Tente de novo.');
        return;
      }
    }
    await definirBloqueio(valor);
    setAtivo(valor);
  }

  const indisponivel = disp && !disp.disponivel;

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Rotulo>Bloqueio do app</Rotulo>

        <Cartao>
          <Linha
            glifo="🔒"
            cor={c.brandLight}
            label={disp?.disponivel ? NOME[disp.tipo] : 'Biometria'}
            descricao={
              indisponivel
                ? disp!.motivo === 'sem_hardware'
                  ? 'Este aparelho não tem sensor'
                  : 'Cadastre uma digital ou rosto nos Ajustes do sistema'
                : 'Exigir ao abrir o app'
            }
            ultima
          />
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, alignItems: 'flex-end' }}>
            <Switch
              value={ativo}
              disabled={!disp?.disponivel}
              onValueChange={alternar}
              trackColor={{ true: c.brand, false: c.surfaceAlt }}
              thumbColor="#fff"
            />
          </View>
        </Cartao>

        <Rotulo>Por que isto existe</Rotulo>
        <Paragrafo>
          Com o bloqueio ligado, sair do app deixa de exigir link novo por e-mail: a sessão
          continua salva e voltar pede só a sua digital ou o seu rosto.
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
