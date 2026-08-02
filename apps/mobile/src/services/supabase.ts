import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@sentinela/shared';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ausentes. Confira o .env.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Em RN não existe URL de callback no window. Quem lê o deep link e cria a
    // sessão é src/services/authLink.ts.
    detectSessionInUrl: false,
  },
});

/**
 * Renovação do token atrelada ao ciclo de vida do app.
 *
 * `autoRefreshToken: true` NÃO basta em React Native, e essa é a diferença que
 * derrubava a sessão. O temporizador interno do supabase-js só corre enquanto
 * o runtime JS está vivo e em primeiro plano; assim que o SO congela o app, ele
 * para. O JWT vale 1 hora — passando disso com o app em segundo plano, ninguém
 * renova, e ao reabrir o token guardado está vencido. O usuário volta para a
 * tela de "enviar link" mesmo tendo entrado há pouco.
 *
 * Este é o trecho que a documentação do supabase-js manda escrever à mão em RN:
 * retomar a renovação ao voltar para o primeiro plano e suspender ao sair.
 *
 * Registrado no escopo do módulo de propósito: precisa valer desde o primeiro
 * import, antes de qualquer componente montar. Rodar também no runtime que o SO
 * cria para a task de background é inofensivo — lá o estado é 'background' e o
 * efeito é apenas suspender o que já está suspenso.
 */
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

// O primeiro 'change' só chega quando o estado MUDA. Sem esta chamada, o app
// recém-aberto ficaria sem renovação até o usuário sair e voltar.
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
