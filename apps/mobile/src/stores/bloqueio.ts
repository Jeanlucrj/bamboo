import { create } from 'zustand';
import { bloqueioAtivo } from '../services/bloqueio';

/**
 * Biometria como FORMA DE ENTRAR — não como cadeado.
 *
 * A distinção decide tudo o que este arquivo faz:
 *
 *   entrar   acontece UMA vez, ao abrir o app. É o que substitui o link
 *            mágico por e-mail. A sessão continua salva no aparelho; a digital
 *            só confirma quem está abrindo.
 *
 *   travar   é o que este arquivo NÃO faz mais. A versão anterior re-trancava
 *            o app sozinha depois de 2 minutos em segundo plano e ainda tinha
 *            um botão "Bloquear agora" no Perfil. Na prática isso pedia
 *            digital no meio do uso: trocar para o mapa, voltar, e o app
 *            estava fechado de novo.
 *
 * Num app de emergência isso é pior do que chato. O botão de pânico fica atrás
 * de qualquer tela que apareça por cima — e a pessoa que precisa dele tem
 * alguns segundos, não uma etapa de autenticação.
 *
 * Então: pede na abertura, e não pede mais nada até a próxima abertura.
 */
type EntradaStore = {
  /** True enquanto a confirmação da abertura não passou. */
  aguardandoEntrada: boolean;
  /** Marca que já entrou nesta execução do app. */
  liberar: () => void;
  /** Chamado uma vez na partida: só exige se o usuário ativou a biometria. */
  avaliarNaAbertura: () => Promise<void>;
  /** Sessão encerrada: a próxima abertura volta a perguntar. */
  reiniciar: () => void;
};

export const useBloqueioStore = create<EntradaStore>((set) => ({
  aguardandoEntrada: false,

  liberar: () => set({ aguardandoEntrada: false }),
  reiniciar: () => set({ aguardandoEntrada: false }),

  async avaliarNaAbertura() {
    set({ aguardandoEntrada: await bloqueioAtivo() });
  },
}));
