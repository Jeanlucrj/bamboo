'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STATE_META, SIGNAL_LABEL, toTrafficLight, type SafetyState } from '@sentinela/shared';
import type { OrgTravelerStatus } from '@sentinela/shared';
import { createBrowserClient } from '@/lib/supabase/client';

const TONE = {
  red: {
    card: 'border-red-800/30 bg-red-950/15',
    dot: 'bg-red-500',
    text: 'text-red-300',
    glow: '0 0 20px rgba(239,68,68,0.15)',
    dotGlow: 'shadow-glow-red',
  },
  amber: {
    card: 'border-amber-800/30 bg-amber-950/15',
    dot: 'bg-amber-500',
    text: 'text-amber-300',
    glow: '0 0 20px rgba(245,158,11,0.15)',
    dotGlow: 'shadow-glow-amber',
  },
  green: {
    card: 'border-emerald-800/20 bg-slate-900/40',
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    glow: 'none',
    dotGlow: 'shadow-glow-emerald',
  },
  grey: {
    card: 'border-slate-800/30 bg-slate-900/30',
    dot: 'bg-slate-600',
    text: 'text-slate-500',
    glow: 'none',
    dotGlow: '',
  },
} as const;

export function TrafficLightGrid({
  travelers,
  orgSlug,
}: {
  travelers: OrgTravelerStatus[];
  orgSlug: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(travelers);

  useEffect(() => setRows(travelers), [travelers]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`org-travelers:${orgSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'travel_sessions' },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgSlug, router]);

  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <p className="text-slate-400">Nenhum viajante cadastrado nesta organização.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((t) => {
        const light = toTrafficLight(t.traffic_light);
        const tone = TONE[light];
        const meta = t.state ? STATE_META[t.state as SafetyState] : null;
        const isUrgent = light === 'red' || light === 'amber';

        return (
          <Link
            key={t.user_id}
            href={`/${orgSlug}/viajantes/${t.user_id}`}
            className={`glass-card group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 ${tone.card}`}
            style={{ boxShadow: tone.glow }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{t.full_name}</p>
                <p className="truncate text-sm text-slate-500">
                  {t.title ?? 'Sem viagem ativa'}
                </p>
              </div>
              {/* Dot com pulse para estados urgentes */}
              <span className={`relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ${tone.dot}`}>
                {isUrgent && (
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full ${tone.dot} animate-ping opacity-60`}
                  />
                )}
              </span>
            </div>

            {meta && (
              <p className={`mt-4 text-sm font-semibold ${tone.text}`}>{meta.label}</p>
            )}

            <dl className="mt-3 space-y-1.5 text-xs text-slate-500">
              {t.last_signal_at && (
                <div className="flex justify-between gap-2">
                  <dt>Último sinal</dt>
                  <dd className="text-slate-400">
                    {relative(t.last_signal_at)}
                    {t.last_signal_kind ? ` · ${SIGNAL_LABEL[t.last_signal_kind]}` : ''}
                  </dd>
                </div>
              )}
              {t.expected_checkin_at && (
                <div className="flex justify-between gap-2">
                  <dt>Próximo check-in</dt>
                  <dd className="text-slate-400">{relative(t.expected_checkin_at)}</dd>
                </div>
              )}
              {/* Localização só aparece quando há incidente */}
              {t.city && (
                <div className="flex justify-between gap-2">
                  <dt>Local</dt>
                  <dd className="text-slate-400">
                    {t.city}
                    {t.country_code ? `, ${t.country_code}` : ''}
                  </dd>
                </div>
              )}
            </dl>
          </Link>
        );
      })}
    </div>
  );
}

function relative(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const unit = min < 60 ? `${min} min` : min < 1440 ? `${Math.round(min / 60)}h` : `${Math.round(min / 1440)}d`;
  return diff < 0 ? `há ${unit}` : `em ${unit}`;
}
