import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';

// Segura a splash NATIVA até nós mandarmos escondê-la. Sem isto o SO a remove
// assim que o JS carrega e aparece um flash do fundo entre ela e a nossa
// abertura animada. Fora do componente de propósito: precisa valer antes de
// qualquer render.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* já escondida — acontece no fast refresh e é inofensivo */
});

// ⚠️ IMPORT OBRIGATÓRIO, mesmo sem uso aparente neste arquivo.
// TaskManager.defineTask precisa executar durante o import do módulo. Quando o
// SO acorda o app em background ele recria o runtime JS do zero e só carrega o
// entry point: se a task não for definida aqui, o ping é perdido em silêncio.
import '../src/services/location/backgroundLocation';

import { supabase } from '../src/services/supabase';
import { flushQueue } from '../src/services/location/pingQueue';
import { registerForPush } from '../src/services/notifications';
import { registerDevice, getDeviceId } from '../src/services/device';
import { handleAuthLink } from '../src/services/authLink';
import { Abertura } from '../src/components/Abertura';
import { useSessionStore } from '../src/stores/session';
import { ThemeProvider, useColors, useTheme } from '../src/theme';

export default function RootLayout() {
  // O provider precisa envolver TODA a árvore, inclusive o Stack — senão as
  // telas montam antes do contexto existir e `useColors` estoura.
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const colors = useColors();
  const { scheme } = useTheme();
  const [aberturaVisivel, setAberturaVisivel] = useState(true);
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

  /**
   * Deep link do e-mail — é o que fecha o login.
   *
   * Dois caminhos, e os dois são necessários: `getInitialURL` cobre o app
   * FECHADO (o toque no link é o que o abre) e o listener cobre o app já em
   * segundo plano. Só um dos dois deixa metade dos usuários travados,
   * dependendo de o app estar aberto ou não na hora do clique.
   */
  const linkTratado = useRef<string | null>(null);

  useEffect(() => {
    async function tratar(url: string | null) {
      if (!url || linkTratado.current === url) return;
      linkTratado.current = url;

      const r = await handleAuthLink(url);
      if (r.handled && !r.ok) Alert.alert('Não foi possível entrar', r.error);
    }

    Linking.getInitialURL().then(tratar);
    const sub = Linking.addEventListener('url', (e) => tratar(e.url));
    return () => sub.remove();
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

    // A sessão de viagem primeiro, sozinha e sem esperar por nada.
    //
    // Antes isto rodava DEPOIS de registerForPush() e registerDevice(), em
    // cadeia. O resultado: qualquer travada no registro de push — o diálogo de
    // permissão sem resposta, getExpoPushTokenAsync pendurado na rede — e o
    // load() nunca acontecia. A Home ficava em "Carregando…" para sempre, sem
    // erro nenhum, por causa de algo que ela nem usa.
    useSessionStore.getState().load();

    // Push e registro de aparelho em paralelo, isolados. São importantes — o
    // device_id carimba os sinais e o push entrega o aviso antes do alerta —
    // mas nenhum dos dois é pré-requisito para desenhar a tela.
    (async () => {
      try {
        const token = await registerForPush();
        await registerDevice(token);
      } catch (e) {
        console.warn('[sentinela] registro de push/aparelho falhou:', e);
      }
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

  // A splash nativa sai assim que a nossa abertura já está montada por cima.
  // Escondê-la antes deixaria um frame de fundo cru entre as duas.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <>
      {/* Ícones da barra de status acompanham o tema: 'light' sobre fundo
          claro deixa relógio e bateria invisíveis. */}
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
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

        {/* Telas que já eram navegadas pelo Perfil e não existiam — tocar em
            qualquer uma delas não levava a lugar nenhum. */}
        <Stack.Screen name="contatos/index" options={{ title: 'Contatos de emergência' }} />
        <Stack.Screen name="contatos/dossie" options={{ title: 'Dossiê médico' }} />
        <Stack.Screen name="perfil/acessos" options={{ title: 'Acessos ao dossiê' }} />
        <Stack.Screen name="perfil/exportar" options={{ title: 'Exportar meus dados' }} />
        <Stack.Screen name="perfil/apagar" options={{ title: 'Apagar dados' }} />
        <Stack.Screen name="perfil/assinatura" options={{ title: 'Assinatura' }} />
        <Stack.Screen name="perfil/aparencia" options={{ title: 'Aparência' }} />
      </Stack>

      {/* Por cima de tudo até a sessão ser restaurada. `ready` vem do
          getSession — enquanto ele não resolve, não sabemos se o usuário está
          logado, e mostrar a árvore de navegação nesse intervalo causava o
          pisca-pisca entre onboarding e abas. */}
      {aberturaVisivel && (
        <Abertura pronto={ready} onFim={() => setAberturaVisivel(false)} />
      )}
    </>
  );
}
