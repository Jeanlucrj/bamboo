export { ThemeProvider, useTheme, useColors, useStyles, type ThemePref } from './ThemeProvider';
export { PALETTES, DARK, LIGHT, type Palette, type ThemeName } from './palettes';

/**
 * Paleta escura como export estático.
 *
 * Mantida para as telas que ainda não foram migradas para `useColors()` e para
 * o pouco que roda fora da árvore React — a task de background e o canal de
 * notificação do Android, que precisam de uma cor e não têm contexto.
 *
 * Em componente novo, use `useColors()`: importar daqui congela o tema escuro
 * e o botão de alternância não terá efeito naquela tela.
 */
export const colors = {
  bg: '#000000',
  surface: '#101316',
  surfaceAlt: '#181C20',
  border: '#22272C',

  text: '#FFFFFF',
  textMuted: '#8C949C',
  textFaint: '#5A6168',

  brand: '#0D9488',
  brandLight: '#2DD4BF',

  safe: '#4ADE80',
  grace: '#FBBF24',
  warning: '#FB923C',
  alert: '#F87171',
  sos: '#EF4444',
  resolved: '#4ADE80',
  idle: '#3F464C',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/**
 * Raios generosos.
 *
 * `card: 24` é o que faz um bloco parecer objeto sólido em vez de div com
 * borda. Raio pequeno em cartão grande lê como caixa de formulário; grande o
 * bastante e o olho registra volume. `tile: 14` é o quadrado do ícone, que
 * precisa acompanhar sem competir.
 */
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  card: 24,
  tile: 14,
  /** Bloco sem borda, separado do fundo só por luminosidade. */
  bloco: 18,
  pill: 999,
} as const;

/**
 * Escala tipográfica com tracking negativo nos tamanhos grandes.
 *
 * Fonte de sistema em peso alto e corpo grande fica frouxa no padrão; apertar
 * o espaçamento é o que dá densidade de produto financeiro. Nos tamanhos
 * pequenos o efeito se inverte e prejudica leitura, então lá o tracking é
 * positivo.
 */
export const type = {
  hero: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1.6 },
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.6 },
  h2: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: '500' as const },
  small: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.1 },

  /**
   * Rótulo minúsculo em caixa alta, acima ou abaixo de um valor grande.
   *
   * Menor que `overline` de propósito: aqui o rótulo é serviço, não título de
   * seção. Quem manda é o número — o olho pousa nele primeiro e só depois
   * procura a legenda. Com os dois no mesmo peso, a tela vira lista de pares e
   * nada se destaca.
   */
  eyebrow: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.4 },

  /** Valor dentro da grade de métricas. */
  metrica: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.4 },
} as const;

export const stateColor: Record<string, string> = {
  safe: colors.safe,
  grace: colors.grace,
  warning: colors.warning,
  alert: colors.alert,
  sos: colors.sos,
  resolved: colors.resolved,
};
