import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Sem push, o nudge do estado `grace` nunca chega — e o usuário só descobre
 * que estava atrasado quando a família já foi acionada. Permissão de
 * notificação não é opcional neste produto.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    return await registarInterno();
  } catch (e) {
    // Nunca propaga. Push é importante mas não é pré-requisito para o app
    // funcionar — e uma exceção aqui já derrubou o carregamento da Home uma vez.
    console.warn('[push] registro falhou:', e);
    return null;
  }
}

async function registarInterno(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[push] emulador não recebe push');
    return null;
  }

  if (Platform.OS === 'android') {
    // Canal separado para alertas críticos: som próprio e importância máxima.
    await Notifications.setNotificationChannelAsync('alerts-critical', {
      name: 'Alertas de segurança',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#DC2626',
      sound: 'default',
      bypassDnd: true,
    });
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Geral',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // Atravessa o Modo Foco. Exige entitlement da Apple — peça cedo,
        // a aprovação leva semanas.
        allowCriticalAlerts: true,
      },
    });
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  const token = (await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  )).data;

  // A persistência do token é responsabilidade de registerDevice(): o token é
  // do APARELHO, não do usuário. Gravar direto em profiles.push_token, como
  // era feito aqui, faz o segundo celular sobrescrever o primeiro e o push do
  // aparelho antigo simplesmente para de chegar, sem erro em lugar nenhum.
  return token;
}

/**
 * Lembrete local do próximo check-in.
 * Roda no device: chega mesmo sem internet, ao contrário do push.
 */
export async function scheduleCheckinReminder(expectedAt: Date, sessionId: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const oneHourBefore = new Date(expectedAt.getTime() - 60 * 60 * 1000);
  if (oneHourBefore <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Check-in em 1 hora',
      body: 'Abra o app e confirme que está tudo bem — leva um toque.',
      data: { type: 'checkin_reminder', session_id: sessionId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: oneHourBefore },
  });
}
