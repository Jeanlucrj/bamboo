import { useCallback, useEffect, useRef, useState } from 'react';
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
import { TelaBloqueio } from '../src/components/TelaBloqueio';
import {
  stopBackgroundTracking,
  sincronizarRastreamento,
} from '../src/services/location/backgroundLocation';
import { useSessionStore } from '../src/stores/session';
import { useBloqueioStore } from '../src/stores/bloqueio';
import { usePerfilStore } from '../src/stores/perfil';
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
  const aguardandoEntrada = useBloqueioStore((s) => s.aguardandoEntrada);
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
   * Decide se a tela de desbloqueio entra.
   *
   * Só faz sentido quando JÁ existe sessão salva: sem sessão o caminho é o
   * login normal, e pedir biometria antes dele não protegeria nada.
   */
  useEffect(() => {
    if (!ready) return;
    const { reiniciar, avaliarNaAbertura } = useBloqueioStore.getState();
    if (!session) { reiniciar(); return; }
    avaliarNaAbertura();
  }, [ready, session?.user?.id]);

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

  /**
   * Guarda de rotas.
   *
   * `TELAS_DE_ENTRADA` existe porque a versão anterior expulsava para as abas
   * QUALQUER rota de `(onboarding)` assim que houvesse sessão — e o grupo tem
   * duas telas que não são entrada: as de permissão de localização e de
   * notificação. O efeito prático era que as duas nunca apareciam:
   *
   *   - No onboarding, o link mágico cria a sessão e a guarda dispara antes de
   *     qualquer navegação para elas.
   *   - No Perfil, "Permissões de localização" e "Notificações" pulavam direto
   *     para a Home, porque o usuário logado tocando nelas caía exatamente no
   *     caso `session && inOnboarding`.
   *
   * Não era cosmético. A tela de localização é priming: no iOS o diálogo de
   * "Sempre" aparece UMA vez na vida do app, e negar por não entender o motivo
   * só se desfaz nos Ajustes do sistema. Sem ela, o prompt nativo chegava cru,
   * disparado lá de dentro da criação de viagem.
   *
   * Só `bem-vindo` e `login` precisam ser bloqueadas para quem já entrou.
   */
  useEffect(() => {
    if (!ready) return;
    const TELAS_DE_ENTRADA = ['bem-vindo', 'login'];
    // `useSegments()` é tipado como tupla de tamanho 1; ler o índice 1 direto
    // não compila, embora em tempo de execução o array tenha a rota inteira.
    const partes = segments as unknown as string[];
    const inOnboarding = partes[0] === '(onboarding)';
    const naEntrada = inOnboarding && TELAS_DE_ENTRADA.includes(partes[1] ?? '');

    if (!session && !inOnboarding) {
      router.replace('/(onboarding)/bem-vindo');
      return;
    }
    if (!session || !naEntrada) return;

    // Quem ACABOU de entrar pelo link mágico passa pelo priming de localização
    // antes das abas — é o único momento em que dá para explicar o "Sempre"
    // antes do diálogo do sistema. As telas de permissão encadeiam até
    // `replace('/(tabs)')` no fim.
    //
    // Quem abre o app com sessão já salva não passa por aqui: `segments[0]`
    // nem é `(onboarding)`, e a guarda não toca em nada.
    if (partes[1] === 'login') router.replace('/(onboarding)/permissoes-localizacao');
    else router.replace('/(tabs)');
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

    // Nome e país do cabeçalho. Separado do load() da viagem de propósito: o
    // perfil quase nunca muda, e recarregá-lo a cada sinal de vida faria a
    // identidade piscar no topo de quatro telas.
    usePerfilStore.getState().carregar();

    /**
     * Tempo real de `travel_sessions` — é o que faz uma viagem criada no site
     * aparecer no celular sem precisar puxar a tela.
     *
     * Aqui e não na Home: montada lá, a inscrição subia junto com a primeira
     * renderização, que pode acontecer antes de a sessão salva ser restaurada.
     * Canal sem token é canal que a RLS não alimenta — conecta, responde
     * SUBSCRIBED e nunca entrega nada. Este efeito só roda quando `session` já
     * existe, então o token está em mãos.
     */
    const cancelarInscricao = useSessionStore.getState().subscribe(session.user.id);

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

    // Fecha o canal ao sair da conta. Sem isto, trocar de usuário deixaria o
    // anterior escutando — e o novo abriria um segundo canal por cima.
    return cancelarInscricao;
  }, [session?.user?.id]);

  /**
   * Abrir o app é sinal de vida: alguém destravou o telefone e entrou. É o que
   * zera o cronômetro da Home.
   *
   * Extraído para uma função própria porque precisa rodar em DOIS momentos, e
   * antes só rodava em um.
   */
  const ultimaAbertura = useRef<{ viagem: string; em: number } | null>(null);

  const registrarAbertura = useCallback(async () => {
    await flushQueue();

    // Heartbeat do aparelho: é o que separa "app instalado" de "app vivo"
    // no painel de admin.
    registerDevice();

    const ativa = useSessionStore.getState().session;

    // Alinha a task do aparelho com o que a viagem diz no banco. Cobre o caso
    // de a viagem ter sido criada ou encerrada pelo site, que não tem como
    // mexer no rastreamento deste celular.
    await sincronizarRastreamento(ativa).catch(() => {});

    if (!ativa) return;

    // Duas entradas quase simultâneas (o efeito de montagem e o AppState logo
    // depois) gravariam dois `app_open` seguidos. O segundo não muda o
    // cronômetro por causa do clamp temporal, mas suja o histórico de sinais.
    const anterior = ultimaAbertura.current;
    if (anterior?.viagem === ativa.id && Date.now() - anterior.em < 30_000) return;
    ultimaAbertura.current = { viagem: ativa.id, em: Date.now() };

    await supabase.rpc('record_signal', {
      p_session_id: ativa.id,
      p_kind: 'app_open',
      p_source: Platform.OS,
      p_device_id: (await getDeviceId()) ?? undefined,
    });
    await useSessionStore.getState().load();
  }, []);

  /**
   * ABERTURA FRIA — o caso que faltava.
   *
   * `AppState.addEventListener('change', ...)` só dispara quando o estado MUDA.
   * Numa abertura do zero — app fechado, celular reiniciado, app descarregado
   * da memória — o estado já é 'active' quando o JS começa a rodar. Não há
   * mudança, o evento nunca vem, e o `app_open` nunca era enviado.
   *
   * O sintoma era o cronômetro da Home não voltar "às vezes": voltando do
   * segundo plano funcionava, abrindo do zero não. E "às vezes" só porque
   * depende de o Android ter mantido o app em memória.
   *
   * Num Dead Man's Switch isso não é cosmético. `app_open` é uma das três
   * provas de vida; se ele se perde justamente na abertura fria, o cronômetro
   * segue correndo para quem está usando o app na frente da tela — e o alarme
   * caminha para acionar a família de alguém que está bem.
   *
   * A chave inclui o id da viagem: sem sessão de viagem carregada não há o que
   * registrar, e o efeito precisa esperar o `load()` terminar.
   */
  const viagemAtivaId = useSessionStore((s) => s.session?.id);

  useEffect(() => {
    if (!session || !viagemAtivaId) return;
    registrarAbertura();
  }, [session?.user?.id, viagemAtivaId, registrarAbertura]);

  // Voltar ao foreground vale como sinal de vida e é a hora certa de
  // esvaziar a fila offline — é quando há mais chance de ter rede.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      // Voltar do segundo plano também é ENTRAR no app, então também pede
      // biometria — com a janela de tolerância da store, que existe para o
      // próprio diálogo do sistema não virar laço infinito.
      if (state !== 'active') {
        useBloqueioStore.getState().aoSair();
        return;
      }

      await useBloqueioStore.getState().aoVoltar();
      if (!session) return;

      await registrarAbertura();
    });
    return () => sub.remove();
  }, [session, registrarAbertura]);

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
        <Stack.Screen name="viagem/historico" options={{ title: 'Minhas viagens' }} />
        <Stack.Screen name="contatos/novo" options={{ title: 'Novo contato', presentation: 'modal' }} />

        {/* Telas que já eram navegadas pelo Perfil e não existiam — tocar em
            qualquer uma delas não levava a lugar nenhum. */}
        <Stack.Screen name="contatos/index" options={{ title: 'Contatos de emergência' }} />
        <Stack.Screen name="contatos/dossie" options={{ title: 'Dossiê médico' }} />
        <Stack.Screen name="perfil/dados" options={{ title: 'Meus dados' }} />
        <Stack.Screen name="perfil/acessos" options={{ title: 'Acessos ao dossiê' }} />
        <Stack.Screen name="perfil/exportar" options={{ title: 'Exportar meus dados' }} />
        <Stack.Screen name="perfil/apagar" options={{ title: 'Apagar dados' }} />
        <Stack.Screen name="perfil/assinatura" options={{ title: 'Assinatura' }} />
        <Stack.Screen name="perfil/aparencia" options={{ title: 'Aparência' }} />
        <Stack.Screen name="perfil/bloqueio" options={{ title: 'Bloqueio' }} />
      </Stack>

      {/* Por cima de tudo até a sessão ser restaurada. `ready` vem do
          getSession — enquanto ele não resolve, não sabemos se o usuário está
          logado, e mostrar a árvore de navegação nesse intervalo causava o
          pisca-pisca entre onboarding e abas. */}
      {/* Abaixo da abertura na pilha: quando as duas existem, a abertura sai
          primeiro e revela o bloqueio, sem piscar a árvore de navegação. */}
      {aguardandoEntrada && !aberturaVisivel && (
        <TelaBloqueio
          onDesbloquear={() => useBloqueioStore.getState().liberar()}
          onSair={async () => {
            await stopBackgroundTracking().catch(() => {});
            await supabase.auth.signOut();
            useBloqueioStore.getState().reiniciar();
          }}
        />
      )}

      {aberturaVisivel && (
        <Abertura pronto={ready} onFim={() => setAberturaVisivel(false)} />
      )}
    </>
  );
}
