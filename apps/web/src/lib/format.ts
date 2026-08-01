/** Formatações compartilhadas pelo painel do viajante. */

/**
 * ISO 3166-1 alpha-2 -> emoji de bandeira.
 *
 * Não é tabela: as bandeiras vivem no bloco Regional Indicator do Unicode, que
 * começa em U+1F1E6 exatamente onde o alfabeto começa em 'A'. Somar o
 * deslocamento a cada letra produz o par correto para qualquer país — inclusive
 * os que ainda não existiam quando este código foi escrito.
 */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🏳️';
  const base = 0x1f1e6;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    base + (upper.charCodeAt(0) - 65),
    base + (upper.charCodeAt(1) - 65),
  );
}

export function formatKm(km: number | null | undefined): string {
  const v = km ?? 0;
  if (v >= 1000) return `${Math.round(v).toLocaleString('pt-BR')}`;
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Postgres devolve `interval` como '24:00:00' ou '3 days 04:00:00'.
 * Não existe parser nativo em JS — daí a regex.
 */
export function intervalToHours(interval: string | null | undefined): number {
  if (!interval) return 0;
  const days = /(\d+)\s+day/.exec(interval);
  const time = /(\d+):(\d{2}):/.exec(interval);
  return (days ? Number(days[1]) * 24 : 0) + (time ? Number(time[1]) : 0);
}

/** Duração legível a partir do `interval` de uma visita a país. */
export function humanDuration(interval: string | null | undefined): string {
  const hours = intervalToHours(interval);
  if (hours < 1) return 'menos de 1 h';
  if (hours < 48) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} dias`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 mês' : `${months} meses`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dias`;
  return formatDate(iso);
}
