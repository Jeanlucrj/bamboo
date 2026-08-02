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
  bg: '#0B1120',
  surface: '#111C33',
  surfaceAlt: '#1A2740',
  border: '#243350',

  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textFaint: '#64748B',

  brand: '#0F766E',
  brandLight: '#14B8A6',

  safe: '#10B981',
  grace: '#F59E0B',
  warning: '#F97316',
  alert: '#DC2626',
  sos: '#DC2626',
  resolved: '#10B981',
  idle: '#475569',
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
} as const;

export const stateColor: Record<string, string> = {
  safe: colors.safe,
  grace: colors.grace,
  warning: colors.warning,
  alert: colors.alert,
  sos: colors.sos,
  resolved: colors.resolved,
};
