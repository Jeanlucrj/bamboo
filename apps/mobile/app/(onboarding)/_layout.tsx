import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

/**
 * Layout do onboarding.
 *
 * Sem este arquivo, o expo-router não reconhece `(onboarding)` como um grupo
 * com navegação própria: cada tela vira um screen solto na pilha raiz, o
 * `<Stack.Screen name="(onboarding)" options={{ headerShown: false }} />` de lá
 * não casa com nada, e o header padrão aparece com o nome bruto da rota —
 * era isso que estampava "(onboarding)/bem-vindo" no topo da tela.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
