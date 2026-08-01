'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PLATFORM_LABEL, HEALTH_THRESHOLDS, type DevicePlatform } from '@sentinela/shared';
import { createBrowserClient } from '@/lib/supabase/client';
import { getInstallId } from '@/lib/device/installId';

export type DeviceRow = {
  id: string;
  platform: DevicePlatform;
  install_id: string;
  label: string | null;
  model: string | null;
  os_version: string | null;
  app_version: string | null;
  is_primary: boolean;
  last_seen_at: string;
  last_signal_at: string | null;
};

/**
 * Lista de aparelhos do usuário, separando o que monitora do que só administra.
 *
 * A distinção precisa aparecer aqui, e não só no admin: quem instalou o app em
 * um celular e criou a conta em dois navegadores tem três `devices` e um único
 * aparelho capaz de dar sinal de vida. Sem essa tela a pessoa não tem como
 * saber disso.
 */
export function DeviceList({ devices }: { devices: DeviceRow[] }) {
  const [thisInstall, setThisInstall] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => setThisInstall(getInstallId()), []);

  const mobile = devices.filter((d) => d.platform !== 'web');
  const web = devices.filter((d) => d.platform === 'web');

  async function revoke(id: string) {
    const { error } = await createBrowserClient().rpc('revoke_device', { p_device_id: id });
    if (error) {
      alert(`Não foi possível remover: ${error.message}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <Group
        title="Monitoramento"
        hint="Só o app instalado no celular gera sinal de vida."
        empty="Nenhum celular com o app. Enquanto isso, o Dead Man's Switch não tem como disparar por você."
        emptyTone="warn"
      >
        {mobile.map((d) => (
          <Row key={d.id} device={d} isThis={false} onRevoke={revoke} busy={busy} />
        ))}
      </Group>

      <Group
        title="Acesso pela web"
        hint="Conta, contatos e assinatura. Não produz sinal de vida."
        empty="Nenhuma sessão de navegador registrada."
      >
        {web.map((d) => (
          <Row
            key={d.id}
            device={d}
            isThis={thisInstall === d.install_id}
            onRevoke={revoke}
            busy={busy}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({
  title, hint, empty, emptyTone, children,
}: {
  title: string;
  hint: string;
  empty: string;
  emptyTone?: 'warn';
  children: React.ReactNode[];
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>

      {children.length === 0 ? (
        <p
          className={`mt-3 rounded-lg border px-4 py-3 text-xs leading-relaxed ${
            emptyTone === 'warn'
              ? 'border-amber-900 bg-amber-950/50 text-amber-200'
              : 'border-slate-800 bg-slate-900/60 text-slate-500'
          }`}
        >
          {empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">{children}</ul>
      )}
    </div>
  );
}

function Row({
  device, isThis, onRevoke, busy,
}: {
  device: DeviceRow;
  isThis: boolean;
  onRevoke: (id: string) => void;
  busy: boolean;
}) {
  const staleMs = HEALTH_THRESHOLDS.DEVICE_STALE_DAYS * 86_400_000;
  const isStale = Date.now() - new Date(device.last_seen_at).getTime() > staleMs;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
          {device.label ?? device.model ?? PLATFORM_LABEL[device.platform]}
          {device.is_primary && <Tag tone="teal">Principal</Tag>}
          {isThis && <Tag tone="slate">Este navegador</Tag>}
          {isStale && <Tag tone="amber">Sem uso</Tag>}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {PLATFORM_LABEL[device.platform]}
          {device.os_version ? ` · ${device.os_version}` : ''}
          {device.app_version ? ` · app ${device.app_version}` : ''}
          {' · visto '}
          {new Date(device.last_seen_at).toLocaleString('pt-BR')}
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onRevoke(device.id)}
        className="text-xs font-semibold text-slate-500 transition hover:text-red-400 disabled:opacity-50"
      >
        Remover
      </button>
    </li>
  );
}

function Tag({ tone, children }: { tone: 'teal' | 'slate' | 'amber'; children: React.ReactNode }) {
  const tones = {
    teal: 'border-teal-800 bg-teal-950/60 text-teal-300',
    slate: 'border-slate-700 bg-slate-800 text-slate-300',
    amber: 'border-amber-800 bg-amber-950/60 text-amber-300',
  }[tone];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tones}`}>
      {children}
    </span>
  );
}
