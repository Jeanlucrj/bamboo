import type { SafetyState } from '@sentinela/shared';

/**
 * Tokens visuais dos estados do Dead Man's Switch.
 *
 * As cores vêm da paleta de STATUS (good / warning / serious / critical), que é
 * reservada: nenhuma delas pode virar "cor de série" num gráfico. E nenhuma
 * carrega significado sozinha — todas viajam acompanhadas de ícone e rótulo,
 * porque um daltônico precisa ler o estado tão rápido quanto qualquer um.
 *
 * Os pares warning/serious ficam abaixo do piso de separação para uso
 * categórico (ΔE 13.6). Isso é aceitável aqui e só aqui: os estados aparecem
 * UM POR VEZ na tela, nunca lado a lado como séries de um gráfico.
 */
export type StatusToken = {
  label: string;
  short: string;
  icon: string;
  /** Cor da marca — anel, ponto, barra. Nunca aplicada em texto corrido. */
  mark: string;
  /** Superfície e borda do cartão, já rebaixadas para não competir com o dado. */
  surface: string;
  border: string;
  /** Tinta do rótulo dentro da pílula: passo claro do mesmo tom, para contraste. */
  ink: string;
};

export const STATUS_TOKENS: Record<SafetyState, StatusToken> = {
  safe: {
    label: 'Tudo certo',
    short: 'Seguro',
    icon: '✓',
    mark: '#0ca30c',
    surface: 'rgba(12,163,12,0.10)',
    border: 'rgba(12,163,12,0.35)',
    ink: '#86efac',
  },
  grace: {
    label: 'Aguardando você',
    short: 'Atrasado',
    icon: '!',
    mark: '#fab219',
    surface: 'rgba(250,178,25,0.10)',
    border: 'rgba(250,178,25,0.35)',
    ink: '#fcd34d',
  },
  warning: {
    label: 'Precisamos de um sinal',
    short: 'Atenção',
    icon: '!!',
    mark: '#ec835a',
    surface: 'rgba(236,131,90,0.10)',
    border: 'rgba(236,131,90,0.35)',
    ink: '#fdba74',
  },
  alert: {
    label: 'Contatos acionados',
    short: 'Alerta',
    icon: '▲',
    mark: '#d03b3b',
    surface: 'rgba(208,59,59,0.12)',
    border: 'rgba(208,59,59,0.40)',
    ink: '#fca5a5',
  },
  sos: {
    label: 'Emergência ativa',
    short: 'SOS',
    icon: '▲',
    mark: '#d03b3b',
    surface: 'rgba(208,59,59,0.16)',
    border: 'rgba(208,59,59,0.55)',
    ink: '#fecaca',
  },
  resolved: {
    label: 'Alarme encerrado',
    short: 'Resolvido',
    icon: '✓',
    mark: '#0ca30c',
    surface: 'rgba(12,163,12,0.10)',
    border: 'rgba(12,163,12,0.35)',
    ink: '#86efac',
  },
};

/**
 * Rampa do medidor de tempo — uma única matiz, validada contra a superfície
 * #0B1120: track 2.48:1, preenchimento 3:1+.
 *
 * O anel mede TEMPO RESTANTE, não severidade, e por isso é monocromático. Um
 * track que mudasse de matiz junto com o estado faria a parte vazia parecer uma
 * segunda medição.
 */
export const METER = {
  track: '#115E59',
  fill: '#14B8A6',
} as const;
