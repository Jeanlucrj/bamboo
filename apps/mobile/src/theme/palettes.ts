/**
 * Paletas clara e escura.
 *
 * O escuro é o original do produto e continua sendo o padrão — um app de
 * segurança é aberto de madrugada, em barraca, no ônibus noturno, e tela branca
 * nessas horas cega quem está com a vista adaptada ao escuro.
 *
 * O claro existe para o oposto: sol direto na estrada, onde tela escura fica
 * ilegível. Os tons foram escolhidos com o mesmo papel semântico, não invertidos
 * mecanicamente — `surface` continua sendo "um degrau acima do fundo" nos dois.
 *
 * O FUNDO É PRETO, e antes era azul-noite (#070B14).
 *
 * Azul escuro parece preto no monitor e cinza sujo no celular: em tela OLED o
 * preto real desliga o pixel, e qualquer azul residual vira uma névoa que rouba
 * contraste justamente do número que precisa dominar a tela. Com o fundo em
 * #000 o cronômetro em verde salta, e as superfícies cinza-neutro à frente
 * passam a se separar do fundo por luminosidade em vez de por borda.
 */
export type ThemeName = 'dark' | 'light';

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  /** Linha de luz no topo do cartão — o que dá a sensação de objeto sólido. */
  highlight: string;

  text: string;
  textMuted: string;
  textFaint: string;

  brand: string;
  brandLight: string;

  safe: string;
  grace: string;
  warning: string;
  alert: string;
  sos: string;
  resolved: string;
  idle: string;
};

export const DARK: Palette = {
  bg: '#000000',
  // Cinza neutro, sem viés de matiz: sobre preto puro qualquer azul na
  // superfície reaparece como tingimento e desmonta o efeito do fundo.
  surface: '#101316',
  surfaceAlt: '#181C20',
  // A borda quase não é mais usada — superfície agora se separa por
  // luminosidade. Ela sobrevive para divisores e contornos de botão.
  border: '#22272C',
  highlight: 'rgba(255,255,255,0.05)',

  text: '#FFFFFF',
  textMuted: '#8C949C',
  textFaint: '#5A6168',

  brand: '#0D9488',
  brandLight: '#2DD4BF',

  // Verde-primavera no lugar do esmeralda: é a cor do número herói, e precisa
  // brilhar sobre preto sem parecer néon.
  safe: '#4ADE80',
  grace: '#FBBF24',
  warning: '#FB923C',
  alert: '#F87171',
  // O SOS não acompanha o `alert` clareado: ele preenche um botão com texto
  // branco por cima, e aí o vermelho precisa ser saturado, não pastel.
  sos: '#EF4444',
  resolved: '#4ADE80',
  idle: '#3F464C',
};

export const LIGHT: Palette = {
  // Branco puro no lugar do cinza-azulado, pelo mesmo motivo do preto no
  // escuro: o plano de trás desaparece e o conteúdo é a única coisa na tela.
  bg: '#FFFFFF',
  surface: '#F2F4F5',
  surfaceAlt: '#E8EBEC',
  border: '#DDE1E3',
  highlight: 'rgba(8,9,10,0.03)',

  text: '#08090A',
  textMuted: '#5C646B',
  textFaint: '#8A9299',

  // Tons de marca escurecidos: o #2DD4BF do escuro tem contraste ~1.7:1 sobre
  // branco e some. Estes ficam acima de 3:1.
  brand: '#0F766E',
  brandLight: '#0D9488',

  // Estados também escurecidos. `grace` e `warning` são os piores casos sobre
  // fundo claro — âmbar puro fica invisível.
  safe: '#15803D',
  grace: '#A16207',
  warning: '#C2410C',
  alert: '#B91C1C',
  sos: '#DC2626',
  resolved: '#15803D',
  idle: '#B0B7BD',
};

export const PALETTES: Record<ThemeName, Palette> = { dark: DARK, light: LIGHT };
