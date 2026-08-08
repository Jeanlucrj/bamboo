import { create } from 'zustand';
import { bloqueioAtivo } from '../services/bloqueio';

/**
 * Estado de "o app está trancado agora".
 *
 * Precisa ser um store, e não estado local do layout raiz, por dois motivos que
 * eram bugs reais:
 *
 * 1. O botão "Bloquear app" no Perfil não tinha como trancar coisa alguma. Ele
 *    fazia `router.replace('/(tabs)')` e mostrava um alerta dizendo "ao voltar,
 *    o Sentinela vai pedir sua biometria" — mas não mexia em estado nenhum. O
 *    app continuava destrancado na tela seguinte, e a mensagem estava
 *    simplesmente errada.
 *
 * 2. O único lugar que decidia trancar era um efeito com dependência
 *    `[ready, session.user.id]`. Nenhum dos dois muda quando o app vai para
 *    segundo plano e volta — então a biometria só era pedida em partida fria.
 *    Alguém que pegasse o celular destravado com o Sentinela em segundo plano
 *    entrava direto, que é exatamente o cenário que o bloqueio existe para
 *    cobrir.
 *
 * A JANELA DE TOLERÂNCIA:
 *
 * Trancar a cada ida ao segundo plano pediria digital toda vez que a pessoa
 * consultasse a hora ou copiasse um código. Num app de emergência isso é pior
 * do que parece: atrito no caminho do botão de pânico. Por outro lado, sem
 * limite nenhum o bloqueio não protege nada.
 *
 * 2 minutos separa os dois casos: trocar de app e voltar não tranca; deixar o
 * celular em cima da mesa e alguém pegá-lo depois, tranca.
 */
const TOLERANCIA_MS = 2 * 60 * 1000;

type BloqueioStore = {
  trancado: boolean;
  /** Momento em que o app saiu do primeiro plano. null = está em uso. */
  saiuEm: number | null;

  trancar: () => void;
  destrancar: () => void;
  /** Só tranca se o bloqueio estiver ligado nas configurações. */
  trancarSeConfigurado: () => Promise<void>;
  aoSair: () => void;
  aoVoltar: () => Promise<void>;
};

export const useBloqueioStore = create<BloqueioStore>((set, get) => ({
  trancado: false,
  saiuEm: null,

  trancar: () => set({ trancado: true, saiuEm: null }),
  destrancar: () => set({ trancado: false, saiuEm: null }),

  async trancarSeConfigurado() {
    if (await bloqueioAtivo()) set({ trancado: true, saiuEm: null });
  },

  aoSair: () => {
    if (!get().trancado) set({ saiuEm: Date.now() });
  },

  async aoVoltar() {
    const { saiuEm, trancado } = get();
    set({ saiuEm: null });
    if (trancado || saiuEm === null) return;
    if (Date.now() - saiuEm < TOLERANCIA_MS) return;
    if (await bloqueioAtivo()) set({ trancado: true });
  },
}));
