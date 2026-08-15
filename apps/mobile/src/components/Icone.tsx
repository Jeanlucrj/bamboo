import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

/**
 * Ícones de traço.
 *
 * SUBSTITUEM OS 14 EMOJIS que marcavam as linhas do app.
 *
 * Emoji parecia atalho barato e cobrava caro em três frentes. Ele tem cor
 * própria e ignora `tintColor`, então "verde é proteção, vermelho é
 * destrutivo" era impossível — a cor tinha que vir de um quadrado atrás do
 * glifo. Ele muda de desenho em cada versão de Android e em cada fabricante,
 * então a mesma tela tinha três aparências que nunca vimos. E o peso visual
 * varia demais entre um 🩺 e um 🔒, deixando a lista irregular sem que dê para
 * corrigir.
 *
 * Aqui o traço tem espessura única (1.7), a cor vem por prop e o desenho é o
 * mesmo em qualquer aparelho.
 *
 * `react-native-svg` já era dependência do projeto — nada novo entrou.
 */

export type NomeIcone =
  // abas
  | 'escudo' | 'bussola' | 'mapa' | 'pessoa'
  // perfil
  | 'identidade' | 'contatos' | 'saude' | 'mala' | 'olho' | 'exportar'
  | 'lixeira' | 'aparencia' | 'digital' | 'pino' | 'sino' | 'cartao' | 'porta'
  // avisos e navegação
  | 'alerta' | 'dica' | 'info' | 'seta' | 'check' | 'relogio' | 'raio';

export function Icone({
  nome, cor, tamanho = 20, traco = 1.7,
}: {
  nome: NomeIcone;
  cor: string;
  tamanho?: number;
  traco?: number;
}) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      <G
        fill="none"
        stroke={cor}
        strokeWidth={traco}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {desenho(nome, cor)}
      </G>
    </Svg>
  );
}

function desenho(nome: NomeIcone, cor: string) {
  switch (nome) {
    case 'escudo':
      return <Path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />;

    case 'bussola':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
        </>
      );

    case 'mapa':
      return (
        <>
          <Path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" />
          <Path d="M9 4v13M15 6.5v13" />
        </>
      );

    case 'pessoa':
      return (
        <>
          <Circle cx="12" cy="8" r="3.6" />
          <Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </>
      );

    case 'identidade':
      return (
        <>
          <Rect x="2.8" y="5" width="18.4" height="14" rx="2.4" />
          <Circle cx="8.6" cy="11" r="2.1" />
          <Path d="M5.3 16.6c.4-1.6 1.7-2.5 3.3-2.5s2.9.9 3.3 2.5" />
          <Path d="M15 10h4M15 13.6h4" />
        </>
      );

    case 'contatos':
      return (
        <>
          <Circle cx="9" cy="8.5" r="3.2" />
          <Path d="M2.8 19.2c0-3.2 2.8-5.3 6.2-5.3s6.2 2.1 6.2 5.3" />
          <Circle cx="17.2" cy="7.4" r="2.3" />
          <Path d="M16.2 13.6c2.9-.3 5 1.6 5 4.4" />
        </>
      );

    // Prancheta com cruz, não um coração: o dossiê médico é um documento que
    // alguém lê para socorrer, e coração lê como "favorito" em qualquer lista.
    case 'saude':
      return (
        <>
          <Rect x="4.8" y="4.6" width="14.4" height="15.6" rx="2.4" />
          <Path d="M9.2 4.6h5.6v2.6H9.2z" />
          <Path d="M12 11.4v5M9.5 13.9h5" />
        </>
      );

    case 'mala':
      return (
        <>
          <Rect x="3" y="7.5" width="18" height="12.5" rx="2.4" />
          <Path d="M9 7.5V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2v2.3" />
          <Path d="M9 11.2v5.6M15 11.2v5.6" />
        </>
      );

    case 'olho':
      return (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <Circle cx="12" cy="12" r="2.8" />
        </>
      );

    case 'exportar':
      return (
        <>
          <Path d="M12 3.6v10.2" />
          <Path d="M8.2 10.2l3.8 3.8 3.8-3.8" />
          <Path d="M4.6 16.2v2.3a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-2.3" />
        </>
      );

    case 'lixeira':
      return (
        <>
          <Path d="M4.5 6.6h15" />
          <Path d="M9.6 6.6V4.7a1 1 0 0 1 1-1h2.8a1 1 0 0 1 1 1v1.9" />
          <Path d="M6.6 6.6l.9 12.3a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.3" />
        </>
      );

    // Meio círculo preenchido: o símbolo universal de contraste, e o que
    // melhor diz "claro ou escuro" sem depender de texto.
    case 'aparencia':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 3a9 9 0 0 1 0 18z" fill={cor} stroke="none" />
        </>
      );

    case 'digital':
      return (
        <>
          <Path d="M6 11.2a6 6 0 0 1 12 0" />
          <Path d="M8.6 12.6a3.4 3.4 0 0 1 6.8 0v3.2" />
          <Path d="M12 13.2v4.6" />
          <Path d="M4.2 14.6c0-1 .2-2 .5-2.9M19.3 11.7c.3.9.5 1.9.5 2.9v1.9" />
        </>
      );

    case 'pino':
      return (
        <>
          <Path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" />
          <Circle cx="12" cy="10" r="2.5" />
        </>
      );

    case 'sino':
      return (
        <>
          <Path d="M18 9.4a6 6 0 1 0-12 0c0 4.9-2 5.9-2 5.9h16s-2-1-2-5.9z" />
          <Path d="M10.4 18.9a2 2 0 0 0 3.2 0" />
        </>
      );

    case 'cartao':
      return (
        <>
          <Rect x="2.8" y="5.6" width="18.4" height="12.8" rx="2.4" />
          <Path d="M2.8 10h18.4" />
          <Path d="M6.4 14.6h3.4" />
        </>
      );

    case 'porta':
      return (
        <>
          <Path d="M13.8 4.6H6.6a2 2 0 0 0-2 2v10.8a2 2 0 0 0 2 2h7.2" />
          <Path d="M17.6 12H10M14.6 8.9l3.1 3.1-3.1 3.1" />
        </>
      );

    case 'alerta':
      return (
        <>
          <Path d="M12 4.4l8.7 14.5H3.3L12 4.4z" />
          <Path d="M12 10.2v3.9M12 16.6v.1" />
        </>
      );

    case 'dica':
      return (
        <>
          <Path d="M12 3.6a5.6 5.6 0 0 0-3.3 10.1c.5.4.9 1 1 1.7h4.6c.1-.7.5-1.3 1-1.7A5.6 5.6 0 0 0 12 3.6z" />
          <Path d="M9.7 18h4.6M10.6 20.6h2.8" />
        </>
      );

    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 11.2v5.4M12 7.9v.1" />
        </>
      );

    case 'seta':
      return <Path d="M9.6 5.6l6.4 6.4-6.4 6.4" />;

    case 'check':
      return <Path d="M5.5 12.6l4.2 4.2 8.8-9.6" strokeWidth={2.4} />;

    case 'relogio':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 6.8V12l3.4 2" />
        </>
      );

    case 'raio':
      return <Path d="M13.4 2.8L5 13.6h5.6L10.6 21.2 19 10.4h-5.6l0-7.6z" />;
  }
}
