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
 * Janela mínima, e ela encolheu de 15 s para 2 s de propósito.
 *
 * A regra pedida é "sempre que sair e voltar", então o tempo deixou de ser o
 * critério. Quem separa "saiu" de "não saiu" agora é o ESTADO: só
 * `background` conta como saída — `inactive` não.
 *
 * A distinção importa e é o que torna o "sempre" viável. `inactive` é o estado
 * de transição: puxar a central de notificações, atender uma ligação, girar a
 * tela, ver o seletor de apps. Tratar isso como saída pediria digital dezenas
 * de vezes por dia sem o usuário ter saído de nada.
 *
 * Os 2 s que sobram cobrem só o intervalo entre o app perder o foco e o
 * diálogo do sistema aparecer — pedido de permissão, folha de compartilhar.
 * O diálogo de biometria em si tem trava própria (`autenticando`).
 */
const TOLERANCIA_MS = 2_000;

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
