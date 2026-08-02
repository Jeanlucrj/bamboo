import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = '@sentinela/bloqueio-biometrico';

/**
 * Bloqueio por biometria.
 *
 * Resolve o atrito de precisar de um link novo a cada volta ao app, SEM abrir
 * a porta que "só digitar o e-mail" abriria: e-mail não é segredo — está em
 * qualquer lista de contatos — e aqui ele daria acesso a tipo sanguíneo,
 * alergias e histórico de localização.
 *
 * A distinção que faz isso funcionar:
 *
 *   Bloquear  — a sessão CONTINUA salva no aparelho. Voltar exige só a
 *               digital ou o rosto. É o "sair" que o usuário quer 99% das
 *               vezes.
 *   Sair      — a sessão é destruída de verdade. Voltar exige link novo. É
 *               para quando o aparelho vai trocar de mão.
 *
 * O que a biometria protege é o acesso ao app com uma sessão já válida. Ela
 * não substitui a autenticação no servidor — o token do Supabase continua
 * sendo a credencial real.
 */

export type Disponibilidade =
  | { disponivel: true; tipo: 'facial' | 'digital' | 'iris' | 'outro' }
  | { disponivel: false; motivo: 'sem_hardware' | 'sem_cadastro' };

export async function verificarDisponibilidade(): Promise<Disponibilidade> {
  const temHardware = await LocalAuthentication.hasHardwareAsync();
  if (!temHardware) return { disponivel: false, motivo: 'sem_hardware' };

  // Hardware presente mas sem digital/rosto cadastrado no aparelho: pedir
  // autenticação nesse estado só produz um erro que o usuário não entende.
  const cadastrado = await LocalAuthentication.isEnrolledAsync();
  if (!cadastrado) return { disponivel: false, motivo: 'sem_cadastro' };

  const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const T = LocalAuthentication.AuthenticationType;

  return {
    disponivel: true,
    tipo: tipos.includes(T.FACIAL_RECOGNITION)
      ? 'facial'
      : tipos.includes(T.FINGERPRINT)
        ? 'digital'
        : tipos.includes(T.IRIS)
          ? 'iris'
          : 'outro',
  };
}

export async function bloqueioAtivo(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CHAVE)) === '1';
  } catch {
    return false;
  }
}

export async function definirBloqueio(ativo: boolean): Promise<void> {
  await AsyncStorage.setItem(CHAVE, ativo ? '1' : '0');
}

/**
 * Pede a biometria.
 *
 * `disableDeviceFallback: false` deixa o sistema oferecer o PIN do aparelho
 * quando a digital falha — sem isso, um dedo molhado tranca o usuário para
 * fora do próprio app de emergência.
 */
export async function pedirBiometria(motivo = 'Desbloqueie o Sentinela'): Promise<boolean> {
  const d = await verificarDisponibilidade();
  // Sem hardware ou sem cadastro, exigir biometria trancaria o app para
  // sempre. Nesse caso o bloqueio simplesmente não se aplica.
  if (!d.disponivel) return true;

  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: motivo,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });

  return r.success;
}

export function nomeDoMetodo(tipo: Disponibilidade extends { tipo: infer T } ? T : never): string {
  return { facial: 'reconhecimento facial', digital: 'digital', iris: 'íris', outro: 'biometria' }[
    tipo as 'facial' | 'digital' | 'iris' | 'outro'
  ];
}
