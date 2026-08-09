import { ScrollView } from 'react-native';
import { useTheme, type ThemePref } from '../../src/theme';
import { spacing } from '../../src/theme';
import { Tela, Cartao, Linha, Rotulo, Paragrafo } from '../../src/components/Ui';

const OPCOES: { id: ThemePref; label: string; desc: string }[] = [
  {
    id: 'dark',
    label: 'Escuro',
    desc: 'Padrão. Não cega quem abre o app de madrugada.',
  },
  {
    id: 'light',
    label: 'Claro',
    desc: 'Para sol direto, onde tela escura vira espelho.',
  },
  {
    id: 'system',
    label: 'Seguir o sistema',
    desc: 'Acompanha o modo do aparelho.',
  },
];

export default function Aparencia() {
  const { pref, setPref } = useTheme();

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Rotulo>Tema</Rotulo>

        <Cartao>
          {OPCOES.map((o, i) => (
            <Linha
              key={o.id}
              label={o.label}
              descricao={o.desc}
              marcado={pref === o.id}
              onPress={() => setPref(o.id)}
              ultima={i === OPCOES.length - 1}
            />
          ))}
        </Cartao>

        {/* A descrição de cada opção estava definida em OPCOES e nunca chegava
            à tela: as três linhas apareciam só com "Escuro", "Claro" e "Seguir
            o sistema", sem dizer o que muda. */}

        <Rotulo>Por que isso importa aqui</Rotulo>
        <Paragrafo>
          Neste app a escolha é situacional, não estética. Tela branca de madrugada cega quem
          está com a vista adaptada ao escuro — e é de madrugada que se confere se o alarme está
          armado. Tela escura sob sol direto vira espelho e some. Por isso o padrão é escuro e a
          troca fica a um toque, em vez de depender do horário que o sistema escolhe sozinho.
        </Paragrafo>
      </ScrollView>
    </Tela>
  );
}
