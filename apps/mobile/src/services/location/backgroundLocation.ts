import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Battery from 'expo-battery';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRACKING } from '@sentinela/shared';
import type { Ping } from '@sentinela/shared';
import { enqueue, flushQueue } from './pingQueue';

export const LOCATION_TASK = 'sentinela-background-location';
export const HEARTBEAT_TASK = 'sentinela-heartbeat';

const SESSION_KEY = '@sentinela/active-session-id';

/* ====================================================================== *
 * TASKS
 *
 * defineTask PRECISA rodar no escopo do módulo, e este módulo precisa ser
 * importado no _layout.tsx raiz. Quando o SO acorda o app em background ele
 * recria o runtime JS do zero: se o define não acontecer durante o import,
 * a task simplesmente não existe e o ping é perdido silenciosamente.
 * ====================================================================== */

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[sentinela] erro na task de localização:', error);
    return;
  }

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations?.length) return;

  const sessionId = await AsyncStorage.getItem(SESSION_KEY);
  if (!sessionId) return; // sem viagem ativa, não gravamos nada

  const batteryLevel = await Battery.getBatteryLevelAsync().catch(() => null);

  const pings: Ping[] = locations.map((loc) => ({
    client_ping_id: Crypto.randomUUID(),
    session_id: sessionId,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy_m: loc.coords.accuracy ?? null,
    altitude_m: loc.coords.altitude ?? null,
    speed_mps: loc.coords.speed ?? null,
    battery_level: batteryLevel,
    is_moving: (loc.coords.speed ?? 0) > 1.5,
    // Relógio do DEVICE. O backend usa este valor como sinal de vida (com
    // clamp para não aceitar futuro nem retrocesso). Se usássemos a hora de
    // chegada no servidor, um ping bufferado por 20h resetaria o alarme como
    // se fosse agora — e o Dead Man's Switch nunca dispararia.
    recorded_at: new Date(loc.timestamp).toISOString(),
  }));

  await enqueue(pings);
  await flushQueue(); // best-effort: se a rede falhar, fica na fila
});

TaskManager.defineTask(HEARTBEAT_TASK, async () => {
  try {
    const sessionId = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionId) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Garante ping mesmo com o viajante parado no mesmo hostel há três dias:
    // sem deslocamento, a task de localização nunca é acordada.
    const last = await Location.getLastKnownPositionAsync({
      maxAge: TRACKING.PING_INTERVAL_MS,
    });

    if (last) {
      await enqueue([
        {
          client_ping_id: Crypto.randomUUID(),
          session_id: sessionId,
          lat: last.coords.latitude,
          lng: last.coords.longitude,
          accuracy_m: last.coords.accuracy ?? null,
          altitude_m: null,
          speed_mps: null,
          battery_level: await Battery.getBatteryLevelAsync().catch(() => null),
          is_moving: false,
          recorded_at: new Date(last.timestamp).toISOString(),
        },
      ]);
    }

    const sent = await flushQueue();
    return sent > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (e) {
    console.error('[sentinela] heartbeat falhou:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/* ====================================================================== *
 * PERMISSÕES
 * ====================================================================== */

export type PermissionResult =
  | { granted: true }
  | { granted: false; reason: 'foreground_denied' | 'background_denied' };

export async function requestTrackingPermissions(): Promise<PermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { granted: false, reason: 'foreground_denied' };

  // No iOS este prompt aparece UMA única vez na vida do app. Se o usuário
  // negar, só dá para recuperar mandando ele nos Ajustes do sistema.
  // Chame isto apenas depois da tela de priming que explica o porquê.
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return { granted: false, reason: 'background_denied' };

  return { granted: true };
}

export async function getPermissionStatus() {
  const [fg, bg] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);
  return {
    foreground: fg.status === 'granted',
    background: bg.status === 'granted',
    canAskAgain: fg.canAskAgain && bg.canAskAgain,
  };
}

/* ====================================================================== *
 * ATIVAÇÃO
 * ====================================================================== */

export async function startBackgroundTracking(sessionId: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, sessionId);

  const perm = await requestTrackingPermissions();
  if (!perm.granted) throw new Error(perm.reason);

  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }

  const level = await Battery.getBatteryLevelAsync().catch(() => 1);
  const lowPower = level >= 0 && level < TRACKING.LOW_BATTERY_THRESHOLD;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    // Balanced usa torre de celular + Wi-Fi (~100 m) em vez do chip de GPS.
    // Para responder "em que cidade essa pessoa está" é mais que suficiente,
    // e consome uma fração da bateria de BestForNavigation.
    accuracy: lowPower ? Location.Accuracy.Low : Location.Accuracy.Balanced,
    distanceInterval: lowPower ? TRACKING.LOW_BATTERY_DISTANCE_M : TRACKING.DISTANCE_INTERVAL_M,
    timeInterval: TRACKING.PING_INTERVAL_MS, // respeitado no Android

    // Deferred updates: o SO ACUMULA os pontos e entrega em lote, em vez de
    // acordar o runtime JS a cada movimento. É o maior ganho de bateria aqui.
    deferredUpdatesInterval: TRACKING.PING_INTERVAL_MS,
    deferredUpdatesDistance: lowPower ? 10000 : TRACKING.DEFERRED_DISTANCE_M,

    pausesUpdatesAutomatically: true, // iOS: pausa quando o usuário está parado
    activityType: Location.ActivityType.Other,
    showsBackgroundLocationIndicator: false,

    // Android: sem foreground service, o Doze mode mata a task em horas.
    foregroundService: {
      notificationTitle: 'Sentinela está te acompanhando',
      notificationBody: 'Monitorando sua segurança em segundo plano.',
      notificationColor: '#0F766E',
      killServiceOnDestroy: false,
    },
  });

  const heartbeatRegistered = await TaskManager.isTaskRegisteredAsync(HEARTBEAT_TASK);
  if (!heartbeatRegistered) {
    await BackgroundFetch.registerTaskAsync(HEARTBEAT_TASK, {
      minimumInterval: 60 * 15, // 15 min é o mínimo que o iOS aceita
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  if (await TaskManager.isTaskRegisteredAsync(HEARTBEAT_TASK)) {
    await BackgroundFetch.unregisterTaskAsync(HEARTBEAT_TASK);
  }
  await flushQueue(); // não perca os últimos pontos ao encerrar a viagem
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
}

export type EstadoRastreamento =
  | 'ativo'
  | 'desligado_pelo_usuario'
  | 'sem_viagem'
  | 'falta_permissao';

/**
 * Alinha o rastreamento do APARELHO com o que a viagem diz no banco.
 *
 * Existe porque as duas coisas moram em lugares diferentes e podiam divergir
 * sem ninguém perceber:
 *
 *   travel_sessions.gps_tracking_enabled  ... uma coluna, no servidor
 *   a task de localização ................. registrada no sistema operacional
 *
 * Criar a viagem PELO SITE marcava a coluna como ligada e não tinha como
 * registrar task nenhuma no celular — o site não alcança o aparelho. O app
 * recebia a viagem nova e mostrava "GPS em segundo plano" desligado, com o
 * banco afirmando o contrário.
 *
 * E o estrago não é cosmético: o check-in passivo DEPENDE dos pings de GPS.
 * "Deslocamento conta como sinal de vida" só funciona se alguém estiver
 * medindo deslocamento. Sem a task, o passivo fica ligado na tela e inerte na
 * prática — a pessoa acredita estar coberta e o cronômetro corre até o alarme.
 *
 * NÃO pede permissão sozinha. Um diálogo do sistema aparecendo do nada, sem o
 * usuário ter tocado em nada, é negado por reflexo — e no iOS o de localização
 * em segundo plano só pode ser mostrado uma vez na vida do app. Faltando
 * permissão, devolve `falta_permissao` e quem decide o que mostrar é a tela.
 */
export async function sincronizarRastreamento(sessao: {
  id: string;
  status: string;
  gps_tracking_enabled: boolean;
} | null): Promise<EstadoRastreamento> {
  const ligadoAgora = await isTrackingActive();

  if (!sessao || sessao.status !== 'active') {
    // Viagem encerrada em outro aparelho ou pelo site: parar aqui também,
    // senão o celular segue enviando ping para uma sessão que acabou.
    if (ligadoAgora) await stopBackgroundTracking().catch(() => {});
    return 'sem_viagem';
  }

  if (!sessao.gps_tracking_enabled) {
    if (ligadoAgora) await stopBackgroundTracking().catch(() => {});
    return 'desligado_pelo_usuario';
  }

  if (ligadoAgora) {
    // A task sobrevive a reinício do aparelho, mas o id da viagem fica no
    // AsyncStorage. Reescrever é barato e cobre a troca de viagem.
    await AsyncStorage.setItem(SESSION_KEY, sessao.id);
    return 'ativo';
  }

  const { background } = await getPermissionStatus();
  if (!background) return 'falta_permissao';

  try {
    await startBackgroundTracking(sessao.id);
    return 'ativo';
  } catch {
    return 'falta_permissao';
  }
}

/** Posição imediata — usada pelo SOS e pelo check-in manual. */
export async function getCurrentPosition() {
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
}
