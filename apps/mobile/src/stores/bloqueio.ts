import { create } from 'zustand';
import { bloqueioAtivo } from '../services/bloqueio';

/**
 * Biometria como forma de ENTRAR no app.
 *
 * Duas versões anteriores erraram para lados opostos, e o meio é o que este
 * arquivo faz agora:
 *
 *   1ª  re-trancava sozinha e tinha "Bloquear agora" no Perfil. Pedia digital
 *       no meio do uso — trocar para o mapa e voltar já achava o app fechado.
 *   2ª  passou a pedir SÓ em partida fria (app morto nos recentes). Apertar
 *       início e voltar não remonta a árvore React, então nada era reavaliado
 *       e a biometria simplesmente nunca aparecia.
 *
 * Agora: pede ao ENTRAR — na partida fria e ao voltar de segundo plano — e
 * nunca durante o uso.
 */

/**
 * Janela de tolerância ao voltar do segundo plano.
 *
 * Não é conforto, é necessidade técnica: o próprio diálogo de biometria, o
 * seletor de arquivos e o pedido de permissão do Android tiram o app do
 * primeiro plano. Sem uma janela, voltar do prompt dispararia outro prompt —
 * laço infinito com o usuário preso.
 *
 * 15 s cobre isso e ainda deixa a regra previsível: olhar uma notificação e
 * voltar não pede nada; sair do app de verdade pede.
 */
const TOLERANCIA_MS = 15_000;

type EntradaStore = {
  /** True enquanto a confirmação de entrada não passou. */
  aguardandoEntrada: boolean;
  /** Diálogo do sistema aberto: ignora as trocas de estado que ele provoca. */
  autenticando: boolean;
  /** Momento em que o app saiu do primeiro plano. null = está em uso. */
  saiuEm: number | null;

  liberar: () => void;
  reiniciar: () => void;
  marcarAutenticando: (v: boolean) => void;
  avaliarNaAbertura: () => Promise<void>;
  aoSair: () => void;
  aoVoltar: () => Promise<void>;
};

export const useBloqueioStore = create<EntradaStore>((set, get) => ({
  aguardandoEntrada: false,
  autenticando: false,
  saiuEm: null,

  liberar: () => set({ aguardandoEntrada: false, saiuEm: null }),
  reiniciar: () => set({ aguardandoEntrada: false, saiuEm: null, autenticando: false }),
  marcarAutenticando: (v) => set({ autenticando: v }),

  async avaliarNaAbertura() {
    set({ aguardandoEntrada: await bloqueioAtivo(), saiuEm: null });
  },

  aoSair() {
    const { autenticando, aguardandoEntrada } = get();
    // Já esperando confirmação, ou saindo por causa do próprio prompt: não é
    // uma saída de verdade e não deve reiniciar a contagem.
    if (autenticando || aguardandoEntrada) return;
    set({ saiuEm: Date.now() });
  },

  async aoVoltar() {
    const { autenticando, aguardandoEntrada, saiuEm } = get();
    if (autenticando || aguardandoEntrada) return;

    set({ saiuEm: null });
    if (saiuEm === null || Date.now() - saiuEm < TOLERANCIA_MS) return;

    if (await bloqueioAtivo()) set({ aguardandoEntrada: true });
  },
}));
