'use client';

import { useEffect, useState } from 'react';
import type { SafetyState } from '@sentinela/shared';
import { STATUS_TOKENS, METER } from '@/lib/statusTokens';

const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/**
 * Medidor de tempo até o próximo check-in — com glow pulsante.
 *
 * É a figura-herói da tela: um número ≥48px, e só um por página. O que ele
 * responde é a única pergunta que importa ao abrir o app — "quanto tempo eu
 * tenho antes de alguém ser avisado?".
 */
export function CheckinRing({
  state, lastSignalAt, expectedCheckinAt,
}: {
  state: SafetyState;
  lastSignalAt: string;
  expectedCheckinAt: string;
}) {
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const inicio = new Date(lastSignalAt).getTime();
  const fim = new Date(expectedCheckinAt).getTime();
  const janela = Math.max(fim - inicio, 1);

  const restanteMs = agora === null ? janela : fim - agora;
  const vencido = restanteMs <= 0;
  const fracao = Math.min(Math.max(restanteMs / janela, 0), 1);

  const token = STATUS_TOKENS[state];
  const corAnel = vencido || state !== 'safe' ? token.mark : METER.fill;

  // Glow intensity increases as time runs out
  const urgencia = 1 - fracao;
  const glowOpacity = vencido ? 0.6 : urgencia * 0.4;

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      {/* Glow atrás do anel — pulsa quando urgente */}
      <div
        aria-hidden
        className={`absolute inset-2 rounded-full blur-xl transition-opacity duration-1000 ${vencido ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: corAnel,
          opacity: glowOpacity,
        }}
      />

      <svg width={SIZE} height={SIZE} className="-rotate-90 relative" aria-hidden>
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke={METER.track} strokeWidth={STROKE}
          opacity={0.5}
        />
        {/* Preenchimento com gradiente via filtro */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke={corAnel} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - (vencido ? 1 : fracao))}
          style={{
            transition: 'stroke-dashoffset 700ms ease, stroke 400ms ease',
            filter: `drop-shadow(0 0 6px ${corAnel})`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {agora === null ? (
          <span className="text-4xl font-semibold text-slate-700">—</span>
        ) : vencido ? (
          <>
            <span className="text-[46px] font-semibold leading-none text-white">
              {formatar(-restanteMs)}
            </span>
            <span className="mt-2 text-xs font-medium text-slate-400">de atraso</span>
          </>
        ) : (
          <>
            <span className="text-[46px] font-semibold leading-none text-white">
              {formatar(restanteMs)}
            </span>
            <span className="mt-2 text-xs font-medium text-slate-400">até o check-in</span>
          </>
        )}
      </div>
    </div>
  );
}

function formatar(ms: number): string {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
