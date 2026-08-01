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

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const type = {
  display: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  small: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.4 },
} as const;

export const stateColor: Record<string, string> = {
  safe: colors.safe,
  grace: colors.grace,
  warning: colors.warning,
  alert: colors.alert,
  sos: colors.sos,
  resolved: colors.resolved,
};
