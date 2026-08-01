import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { DevicePlatform } from '@sentinela/shared';
import { supabase } from './supabase';

const INSTALL_KEY = '@sentinela/install-id';
const DEVICE_ID_KEY = '@sentinela/device-id';

/**
 * Identidade do aparelho.
 *
 * O `install_id` é gerado aqui e vive no AsyncStorage. Não usamos IMEI,
 * IDFA nem `Application.androidId`: identificador de hardware é dado pessoal
 * regulado, a Apple rejeita o app por coletá-lo sem finalidade declarada e
 * nada disso é necessário — o que precisamos é reconhecer *este* aparelho,
 * não a pessoa que o carrega.
 *
 * Consequência aceita: reinstalar o app gera um id novo e o registro antigo
 * envelhece até ser limpo. Preferível a pedir permissão que não conseguimos
 * justificar na revisão da loja.
 */
export async function getInstallId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALL_KEY);
  if (existing) return existing;

  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALL_KEY, id);
  return id;
}

/**
 * O device_id acompanha todo sinal e todo lote de pings.
 *
 * Persistido em disco, não só em memória: quando o SO acorda o app em
 * background para entregar uma posição, ele recria o runtime JS do zero. Um
 * cache só de memória estaria vazio justamente no caminho que mais importa —
 * o ping em background — e os pings chegariam sem aparelho identificado.
 */
let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string | null> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    cachedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  } catch {
    cachedDeviceId = null;
  }
  return cachedDeviceId;
}

function platform(): DevicePlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/**
 * Registra (ou atualiza) este aparelho. Idempotente por (user_id, install_id).
 *
 * Chame no login e a cada volta ao foreground: além de criar o registro, é o
 * heartbeat que alimenta o painel de admin — é assim que a operação enxerga
 * "app instalado mas sem abrir há 40 dias", que na prática é desinstalação.
 */
export async function registerDevice(pushToken?: string | null): Promise<string | null> {
  try {
    const installId = await getInstallId();

    // `undefined` e não `null` nos opcionais: o supabase-js omite a chave do
    // corpo JSON, e aí o PostgREST usa o DEFAULT declarado na função. Mandando
    // `null` explícito a chave vai no corpo e sobrescreve o default com NULL —
    // que aqui daria no mesmo, mas em qualquer parâmetro com default não-nulo
    // seria um bug silencioso. Os tipos gerados marcam a diferença.
    const { data, error } = await supabase.rpc('register_device', {
      p_install_id: installId,
      p_platform: platform(),
      p_model: Device.modelName ?? undefined,
      p_os_version: `${Device.osName ?? Platform.OS} ${Device.osVersion ?? ''}`.trim(),
      p_app_version: Constants.expoConfig?.version ?? undefined,
      // Omitir significa "não consegui o token agora": o register_device
      // preserva o que já estava salvo. Não apaga o push.
      p_push_token: pushToken ?? undefined,
      p_label: Device.deviceName ?? undefined,
    });

    if (error) {
      console.warn('[devices] registro falhou:', error.message);
      return null;
    }

    cachedDeviceId = data?.id ?? null;
    if (cachedDeviceId) await AsyncStorage.setItem(DEVICE_ID_KEY, cachedDeviceId);
    return cachedDeviceId;
  } catch (e) {
    // Falhar o registro não pode impedir o app de subir — o monitoramento é
    // mais importante que a telemetria de aparelho.
    console.warn('[devices] registro falhou:', e);
    return null;
  }
}

/** Desvincula este aparelho (usado no logout). */
export async function revokeThisDevice(): Promise<void> {
  const id = await getDeviceId();
  if (!id) return;
  await supabase.rpc('revoke_device', { p_device_id: id });
  cachedDeviceId = null;
  await AsyncStorage.removeItem(DEVICE_ID_KEY);
}
