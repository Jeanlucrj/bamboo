import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, View, ActivityIndicator, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

// ⚠️ IMPORT OBRIGATÓRIO, mesmo sem uso aparente neste arquivo.
// TaskManager.defineTask precisa executar durante o import do módulo. Quando o
// SO acorda o app em background ele recria o runtime JS do zero e só carrega o
// entry point: se a task não for definida aqui, o ping é perdido em silêncio.
import '../src/services/location/backgroundLocation';

import { supabase } from '../src/services/supabase';
import { flushQueue } from '../src/services/location/pingQueue';
import { registerForPush } from '../src/services/notifications';
import { registerDevice, getDeviceId } from '../src/services/device';
import { useSessionStore } from '../src/stores/session';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Guarda de rotas
  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === '(onboarding)';
    if (!session && !inOnboarding) router.replace('/(onboarding)/bem-vindo');
    else if (session && inOnboarding) router.replace('/(tabs)');
  }, [session, ready, segments]);

  // Pós-login
  useEffect(() => {
    if (!session) return;

    // O registro do aparelho vem ANTES do resto: é ele que produz o device_id
    // que carimba os pings e o check-in. Sem ele o sinal chega sem origem e o
    // painel de admin não consegue distinguir app de navegador.
    (async () => {
      const token = await registerForPush();
      await registerDevice(token);
      await useSessionStore.getState().load();
    })();
  }, [session?.user?.id]);

  // Voltar ao foreground vale como sinal de vida e é a hora certa de
  // esvaziar a fila offline — é quando há mais chance de ter rede.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !session) return;

      await flushQueue();

      // Heartbeat do aparelho: é o que separa "app instalado" de "app vivo"
      // no painel de admin.
      registerDevice();

      const active = useSessionStore.getState().session;
      if (active) {
        await supabase.rpc('record_signal', {
          p_session_id: active.id,
          p_kind: 'app_open',
          p_source: Platform.OS,
          p_device_id: (await getDeviceId()) ?? undefined,
        });
        await useSessionStore.getState().load();
      }
    });
    return () => sub.remove();
  }, [session]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brandLight} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="sos/ativo"
          options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="viagem/nova" options={{ title: 'Nova viagem', presentation: 'modal' }} />
        <Stack.Screen name="contatos/novo" options={{ title: 'Novo contato', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
