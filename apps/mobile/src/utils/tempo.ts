/**
 * Conversões de tempo compartilhadas entre as abas.
 *
 * Estavam duplicadas: `parseIntervalHours` vivia dentro de viagem.tsx e
 * `relativeTime` dentro de index.tsx, cada uma privada da sua tela. Com a
 * escada de escalonamento aparecendo nas duas, manter duas cópias garantia que
 * uma delas ficaria para trás.
 */

/** Postgres devolve interval como '24:00:00' ou '1 day 00:00:00'. */
export function horasDoIntervalo(intervalo: string | null | undefined): number {
  if (!intervalo) return 0;
  const dias = /(\d+)\s+day/.exec(intervalo);
  const hora = /(\d+):(\d{2}):/.exec(intervalo);
  return (dias ? Number(dias[1]) * 24 : 0) + (hora ? Number(hora[1]) : 0);
}

/**
 * Tempo restante, no formato mais curto que ainda informa.
 *
 * Acima de um dia mostra "2d 4h", porque "52:18" não é lido como tempo por
 * ninguém. Abaixo disso, "18h 24min" em vez do "18:24" antigo: dois pares de
 * dígitos separados por dois-pontos são indistinguíveis de um horário do
 * relógio, e "18:24" no topo de um app de segurança já foi lido como "o
 * check-in é às seis e vinte e quatro da tarde".
 */
export function formatarRestante(ms: number): string {
  if (ms <= 0) return 'vencido';
  const minutos = Math.floor(ms / 60000);
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

/** "há 12 min", "há 3h", "há 2 dias". */
export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

/** "42 horas", "2 dias e 4 horas" — o total até acionarem os contatos. */
export function totalAteContatos(horas: number): string {
  if (horas < 48) return `${horas} horas`;
  const d = Math.floor(horas / 24);
  const h = horas % 24;
  return h === 0 ? `${d} dias` : `${d} dias e ${h}h`;
}

/** Hora do dia a partir de agora + N horas. Ex.: "às 14:20". */
export function horarioDaqui(ms: number): string {
  const d = new Date(Date.now() + ms);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
