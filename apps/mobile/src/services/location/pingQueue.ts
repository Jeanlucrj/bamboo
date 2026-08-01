import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRACKING } from '@sentinela/shared';
import type { Ping } from '@sentinela/shared';
import { supabase } from '../supabase';
import { getDeviceId } from '../device';

const QUEUE_KEY = '@sentinela/ping-queue';

/**
 * Fila offline de pings.
 *
 * Sem isto, uma viagem de dois dias sem sinal perde todo o histórico — e é
 * exatamente nesse cenário que o produto precisa funcionar. Os pings ficam
 * em disco e sobem quando a conexão voltar.
 *
 * A idempotência mora no banco: location_logs tem UNIQUE (user_id,
 * client_ping_id), então reenviar o mesmo lote depois de um timeout de rede
 * não duplica nada.
 */

export async function readQueue(): Promise<Ping[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Ping[]) : [];
  } catch {
    return [];
  }
}

export async function enqueue(pings: Ping[]): Promise<void> {
  if (!pings.length) return;
  const queue = await readQueue();
  // slice(-MAX): sob overflow, sacrificamos o histórico antigo e preservamos
  // o recente — é o recente que importa para localizar alguém.
  const merged = [...queue, ...pings].slice(-TRACKING.MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(merged));
}

export async function queueSize(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Envia um lote e remove da fila SÓ o que confirmou.
 * Retorna quantos pings foram aceitos pelo servidor.
 */
export async function flushQueue(): Promise<number> {
  const queue = await readQueue();
  if (queue.length === 0) return 0;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 0; // sem token válido, mantém tudo na fila

  const batch = queue.slice(0, TRACKING.BATCH_SIZE);

  // Carimba o lote com o aparelho. Lido do disco porque esta função também
  // roda no runtime recriado pelo SO em background, onde não há cache quente.
  const deviceId = await getDeviceId();

  const { error } = await supabase.rpc('ingest_location_batch', {
    p_pings: batch,
    p_device_id: deviceId ?? undefined,
  });
  if (error) {
    console.warn('[sentinela] flush falhou, fila preservada:', error.message);
    return 0;
  }

  const rest = queue.slice(batch.length);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(rest));

  // Sobrou coisa? Continua esvaziando enquanto houver janela de execução.
  if (rest.length > 0) {
    return batch.length + (await flushQueue());
  }
  return batch.length;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
