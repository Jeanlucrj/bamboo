import { useId } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { type as typo, useColors } from '../theme';

/**
 * O logo do Sentinela dentro do app.
 *
 * ELE NÃO APARECIA EM NENHUMA DAS QUATRO ABAS.
 *
 * Existia no ícone da tela inicial, na tela de abertura, no dossiê que os
 * contatos recebem e no site — em todo lugar menos onde a pessoa passa o tempo.
 * O app aberto não tinha marca alguma: nenhuma tela dizia de quem era aquilo.
 *
 * O desenho é o mesmo do site (`apps/web/src/components/ui/Logo.tsx`): um anel
 * aberto em degradê, que lê como sentinela de guarda e como cronômetro em
 * curso — os dois significados do produto. O anel é aberto de propósito: um
 * círculo fechado vira "carregando".
 *
 * O gradiente precisa de `id` único por instância montada — duas telas com o
 * mesmo id numa mesma árvore fazem a segunda herdar o gradiente da primeira, e
 * no Android isso aparece como logo sem cor.
 *
 * `useId` e não um contador de módulo: o contador daria um id novo A CADA
 * RENDER, recriando o nó de gradiente e obrigando o Android a repintar o SVG
 * toda vez que o cronômetro ao lado atualiza. O `useId` é estável enquanto o
 * componente estiver montado, que é exatamente o tempo de vida do gradiente.
 */
export function Marca({ tamanho = 20 }: { tamanho?: number }) {
  // Os dois-pontos que o React põe no `useId` (`:r1:`) saem fora: id de SVG
  // com `:` é válido no XML mas atravessa um `url(#...)`, e não vale arriscar
  // o logo sumir num aparelho para economizar um replace.
  const id = `anel-sentinela-${useId().replace(/:/g, '')}`;

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" accessibilityLabel="Sentinela">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2DD4BF" />
          <Stop offset="1" stopColor="#0D9488" />
        </LinearGradient>
      </Defs>
      <Circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        // Circunferência ≈ 56,5. Traço de 41 + vão de 15 deixa a abertura em
        // cerca de um quarto do anel — o bastante para ler como aberto sem
        // parecer quebrado.
        strokeDasharray="41 15"
        transform="rotate(-90 12 12)"
      />
    </Svg>
  );
}

/** Anel + palavra, para o topo do Perfil. */
export function MarcaCompleta({ tamanho = 20 }: { tamanho?: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Marca tamanho={tamanho} />
      <Text style={{ ...typo.eyebrow, color: c.textFaint }}>SENTINELA</Text>
    </View>
  );
}
