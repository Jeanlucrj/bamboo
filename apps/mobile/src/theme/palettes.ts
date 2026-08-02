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
  // Fundo mais fundo que o original (#0B1120). Quanto mais escuro o plano de
  // trás, mais o cartão à frente parece pousado sobre ele em vez de recortado
  // nele — é o que separa "bloco com borda" de "objeto".
  bg: '#070B14',
  surface: '#121A2B',
  surfaceAlt: '#1B2438',
  border: '#26314A',
  highlight: 'rgba(255,255,255,0.06)',

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
};

export const LIGHT: Palette = {
  // No claro a hierarquia inverte: o fundo é o cinza e o cartão é o branco
  // puro, que avança. Cartão branco sobre fundo branco não existiria.
  bg: '#EEF2F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F7FB',
  border: '#DCE3ED',
  highlight: 'rgba(15,23,42,0.04)',

  text: '#0F172A',
  textMuted: '#475569',
  textFaint: '#64748B',

  // Tons de marca escurecidos: o #14B8A6 do escuro tem contraste ~1.9:1 sobre
  // branco e some. Estes ficam acima de 3:1.
  brand: '#0F766E',
  brandLight: '#0D9488',

  // Estados também escurecidos. `grace` e `warning` são os piores casos sobre
  // fundo claro — âmbar puro fica invisível.
  safe: '#047857',
  grace: '#B45309',
  warning: '#C2410C',
  alert: '#B91C1C',
  sos: '#B91C1C',
  resolved: '#047857',
  idle: '#94A3B8',
};

export const PALETTES: Record<ThemeName, Palette> = { dark: DARK, light: LIGHT };
