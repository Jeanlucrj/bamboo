import { Platform } from 'react-native';
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
  /** Biometria cadastrada: digital, rosto ou íris. */
  | { disponivel: true; nivel: 'biometria'; rotulo: string }
  /** Sem biometria, mas o aparelho tem PIN/padrão/senha — serve de trava. */
  | { disponivel: true; nivel: 'segredo'; rotulo: string }
  | { disponivel: false; motivo: 'sem_hardware' | 'sem_cadastro' | 'aparelho_sem_trava' };

/**
 * O que este aparelho consegue usar como trava.
 *
 * `getEnrolledLevelAsync` no lugar de `isEnrolledAsync`, e a diferença é o que
 * consertou a lógica: `isEnrolledAsync` só responde "tem biometria?", enquanto
 * o nível distingue os três casos que importam —
 *
 *   NONE       o aparelho não tem trava nenhuma. Não há o que conferir, e
 *              oferecer bloqueio aqui é promessa falsa.
 *   SECRET     sem biometria, mas com PIN/padrão. Serve: o prompt do sistema
 *              aceita o PIN quando `disableDeviceFallback` é false.
 *   BIOMETRIC_WEAK / _STRONG
 *              digital, rosto ou íris cadastrados. Os dois valem como trava —
 *              "weak" é o desbloqueio facial por imagem 2D, menos seguro que
 *              a digital mas ainda melhor que app destrancado no bolso.
 *              `BIOMETRIC` sozinho está deprecado no expo-local-authentication.
 */
export async function verificarDisponibilidade(): Promise<Disponibilidade> {
  const temHardware = await LocalAuthentication.hasHardwareAsync();
  const nivel = await LocalAuthentication.getEnrolledLevelAsync();
  const S = LocalAuthentication.SecurityLevel;

  if (nivel === S.BIOMETRIC_STRONG || nivel === S.BIOMETRIC_WEAK) {
    return { disponivel: true, nivel: 'biometria', rotulo: await rotuloBiometria() };
  }
  if (nivel === S.SECRET) {
    return { disponivel: true, nivel: 'segredo', rotulo: 'PIN ou padrão do aparelho' };
  }

  // Sem nada cadastrado. Separar os motivos muda a instrução que a tela dá:
  // sem sensor não adianta mandar cadastrar digital.
  if (!temHardware) return { disponivel: false, motivo: 'sem_hardware' };
  return { disponivel: false, motivo: 'sem_cadastro' };
}

/**
 * Nome do método biométrico — e por que ele é genérico no Android.
 *
 * `supportedAuthenticationTypesAsync()` devolve o que o HARDWARE suporta, não
 * o que a pessoa cadastrou. Praticamente todo Android com câmera frontal
 * declara FACIAL_RECOGNITION mesmo quando o dono só registrou a digital — e a
 * versão anterior testava FACIAL primeiro, então a tela dizia "Reconhecimento
 * facial" para quem usa o leitor de digital.
 *
 * Não existe API que diga qual método está cadastrado. Então no Android o
 * rótulo não afirma: diz "digital ou rosto", que é verdade nos dois casos.
 *
 * No iOS a distinção é confiável — Face ID e Touch ID são exclusivos por
 * modelo de aparelho — e ali vale nomear.
 */
async function rotuloBiometria(): Promise<string> {
  const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const T = LocalAuthentication.AuthenticationType;

  if (Platform.OS === 'ios') {
    if (tipos.includes(T.FACIAL_RECOGNITION)) return 'Face ID';
    if (tipos.includes(T.FINGERPRINT)) return 'Touch ID';
    return 'Biometria';
  }

  const temDigital = tipos.includes(T.FINGERPRINT);
  const temRosto = tipos.includes(T.FACIAL_RECOGNITION);
  if (temDigital && temRosto) return 'Digital ou rosto';
  if (temDigital) return 'Digital';
  if (temRosto) return 'Reconhecimento facial';
  if (tipos.includes(T.IRIS)) return 'Íris';
  return 'Biometria do aparelho';
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

export type ResultadoBiometria =
  | { ok: true }
  | { ok: false; motivo: 'recusado' | 'sem_trava_no_aparelho' };

/**
 * Pede a confirmação de identidade.
 *
 * `disableDeviceFallback: false` deixa o sistema oferecer o PIN do aparelho
 * quando a digital falha — sem isso, um dedo molhado tranca o usuário para
 * fora do próprio app de emergência.
 *
 * O QUE ESTAVA ERRADO: a versão anterior começava com
 *
 *     if (!d.disponivel) return true;
 *
 * ou seja, quando não havia biometria a função respondia SUCESSO sem perguntar
 * nada. O efeito na prática: quem ligasse o bloqueio e depois removesse a
 * digital do aparelho via a tela de desbloqueio aparecer e sumir sozinha —
 * o app abria destrancado, sem nenhuma verificação. A trava existia na tela e
 * não existia de fato.
 *
 * A intenção original era evitar que alguém ficasse preso do lado de fora, e
 * ela continua atendida — mas pelo caminho certo: com PIN ou padrão
 * cadastrados, o prompt do sistema aceita o PIN e a pessoa entra. O passe
 * livre só sobra para o aparelho SEM trava nenhuma, onde não existe nada a
 * conferir, e mesmo aí quem decide o que fazer é a tela, com o motivo em mãos.
 */
export async function pedirBiometria(
  motivo = 'Desbloqueie o Sentinela',
): Promise<ResultadoBiometria> {
  const d = await verificarDisponibilidade();
  if (!d.disponivel) return { ok: false, motivo: 'sem_trava_no_aparelho' };

  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: motivo,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });

  return r.success ? { ok: true } : { ok: false, motivo: 'recusado' };
}
