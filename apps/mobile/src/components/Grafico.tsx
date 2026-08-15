import { View, Text } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';

import { type as typo, radius, useColors } from '../theme';

/**
 * Cores de categoria.
 *
 * A referência usa cor como TAXONOMIA, não como enfeite: cada tipo de treino
 * tem seu tom no calendário, cada distância tem sua medalha. É o que faz uma
 * lista longa ser percorrida pelo olho em vez de lida linha a linha.
 *
 * Aqui a chave é o id da viagem ou o código do país. Determinístico de
 * propósito: a mesma viagem precisa ter a mesma cor toda vez que a tela abre,
 * senão a cor não significa nada.
 *
 * Nenhum tom de verde, âmbar ou vermelho puro entra nesta lista — esses três
 * são reservados aos estados do alarme, e um país pintado de vermelho ao lado
 * de um degrau vermelho de escalonamento diria uma coisa que não é verdade.
 */
const CATEGORIAS = [
  '#2DD4BF', '#A78BFA', '#60A5FA', '#F472B6',
  '#38BDF8', '#C084FC', '#22D3EE', '#818CF8',
];

export function corDe(chave: string): string {
  let h = 0;
  for (let i = 0; i < chave.length; i += 1) h = (h * 31 + chave.charCodeAt(i)) >>> 0;
  return CATEGORIAS[h % CATEGORIAS.length];
}

export type Barra = { rotulo: string; valor: number };

/**
 * Gráfico de barras com a última destacada.
 *
 * O Diário nunca teve noção de tempo: mostrava totais acumulados e uma lista de
 * paradas, sem nada que dissesse se o mês foi mais ou menos movimentado que o
 * anterior. Progresso ao longo do tempo é o que faz alguém abrir um app de
 * estatísticas sem precisar — e é o que a referência acerta com um gráfico de
 * oito barras e nenhum eixo escrito.
 *
 * Sem biblioteca de gráficos: são retângulos, e `react-native-svg` já era
 * dependência do projeto.
 */
export function GraficoBarras({ dados, altura = 76 }: { dados: Barra[]; altura?: number }) {
  const c = useColors();
  if (dados.length === 0) return null;

  const L = 254;
  const maximo = Math.max(...dados.map((d) => d.valor), 1);
  const vao = 4;
  const largura = Math.max((L - vao * (dados.length - 1)) / dados.length, 4);

  return (
    <View>
      <Svg width="100%" height={altura} viewBox={`0 0 ${L} ${altura}`}>
        {/* Linhas de referência ponteadas: dão escala sem precisar de números
            nos eixos, que nesta largura seriam ilegíveis. */}
        <Path
          d={`M0 ${altura * 0.1} H${L} M0 ${altura * 0.45} H${L} M0 ${altura * 0.8} H${L}`}
          stroke={c.surfaceAlt}
          strokeWidth={0.8}
          strokeDasharray="2 3"
        />
        {dados.map((d, i) => {
          const h = Math.max((d.valor / maximo) * (altura - 6), 3);
          const ultimo = i === dados.length - 1;
          return (
            <Rect
              key={`${d.rotulo}-${i}`}
              x={i * (largura + vao)}
              y={altura - h}
              width={largura}
              height={h}
              rx={3}
              fill={ultimo ? c.brandLight : c.textMuted}
              opacity={ultimo ? 1 : 0.5}
            />
          );
        })}
      </Svg>

      {/* Só as pontas rotuladas: com uma legenda por barra, nada se lê. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
        <Text style={{ ...typo.eyebrow, fontSize: 9, color: c.textFaint }}>
          {dados[0].rotulo.toUpperCase()}
        </Text>
        <Text style={{ ...typo.eyebrow, fontSize: 9, color: c.brandLight }}>
          {dados[dados.length - 1].rotulo.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

/**
 * Medalha de país.
 *
 * SUBSTITUI A FILEIRA DE BANDEIRAS dentro de um cartão cinza. Emoji de bandeira
 * é minúsculo, tem proporção diferente em cada sistema e algumas caem para um
 * retângulo com duas letras no Android — o "passaporte" era a parte mais
 * compartilhável do app e a que pior aparecia.
 *
 * Quadrado colorido com a sigla grande: mesmo tamanho para todos, cor estável
 * por país, e legível a um braço de distância.
 */
export function Medalha({ pais, tamanho }: { pais: string; tamanho: number }) {
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: radius.md,
        backgroundColor: corDe(pais),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: Math.max(tamanho * 0.34, 11),
          fontWeight: '800',
          letterSpacing: 0.5,
          // Tinta preta e não branca: as cores de categoria são claras, e texto
          // branco sobre elas fica com contraste abaixo do legível.
          color: '#000',
        }}
      >
        {pais}
      </Text>
    </View>
  );
}
