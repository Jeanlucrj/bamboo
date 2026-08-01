import { METER } from '@/lib/statusTokens';

const TILE_ICONS: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  'Quilômetros percorridos': {
    icon: '🗺️',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  'Países visitados': {
    icon: '🌐',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  'Cidades': {
    icon: '🏙️',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  'Dias na estrada': {
    icon: '⏱️',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
  },
};

/**
 * Tile de estatística com visual de alto impacto, ícones brilhantes e mini gráficos.
 */
export function StatTile({
  value, label, hint, spark, icon: customIcon,
}: {
  value: string | number;
  label: string;
  hint?: string;
  spark?: number[];
  icon?: string;
}) {
  const theme = TILE_ICONS[label] ?? {
    icon: customIcon ?? '📊',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
  };

  return (
    <div className="modern-card group relative overflow-hidden p-5">
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-15 blur-xl transition-opacity group-hover:opacity-30"
        style={{ background: 'var(--gradient-brand)' }}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white">{value}</span>
          </div>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.border} ${theme.bg} text-lg shadow-inner transition-transform duration-300 group-hover:scale-110`}>
          {theme.icon}
        </div>
      </div>

      {hint && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-800/60 pt-2.5">
          <span className="text-[11px] font-medium text-slate-400">{hint}</span>
        </div>
      )}

      {spark && spark.length > 1 && <Sparkline valores={spark} />}
    </div>
  );
}

function Sparkline({ valores }: { valores: number[] }) {
  const w = 140;
  const h = 32;
  const pad = 4;

  const max = Math.max(...valores, 1);
  const passo = (w - pad * 2) / (valores.length - 1);

  const pontos = valores.map((v, i) => {
    const x = pad + i * passo;
    const y = h - pad - (v / max) * (h - pad * 2);
    return { x: +x.toFixed(1), y: +y.toFixed(1) };
  });

  const linePoints = pontos.map((p) => `${p.x},${p.y}`).join(' ');

  const areaPath = [
    `M ${pontos[0].x},${h}`,
    `L ${pontos[0].x},${pontos[0].y}`,
    ...pontos.slice(1).map((p) => `L ${p.x},${p.y}`),
    `L ${pontos[pontos.length - 1].x},${h}`,
    'Z',
  ].join(' ');

  const ultimo = pontos[pontos.length - 1];

  return (
    <svg width={w} height={h} className="mt-3 block" aria-hidden>
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={METER.fill} stopOpacity="0.4" />
          <stop offset="100%" stopColor={METER.fill} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#sparkArea)" />

      <polyline
        points={linePoints}
        fill="none"
        stroke={METER.fill}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${METER.fill})` }}
      />

      <circle
        cx={ultimo.x} cy={ultimo.y} r={4}
        fill={METER.fill}
        stroke="#070b14"
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 6px ${METER.fill})` }}
      />
    </svg>
  );
}
