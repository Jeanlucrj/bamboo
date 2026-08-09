import { create } from 'zustand';
import { Platform } from 'react-native';
import type { TravelSession, SafetyStateDb } from '@sentinela/shared';
import { supabase } from '../services/supabase';
import { scheduleCheckinReminder } from '../services/notifications';
import { getDeviceId } from '../services/device';

type SessionStore = {
  session: TravelSession | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  checkIn: () => Promise<void>;
  /** `userId` monta o tópico privado `viagens:<uuid>`. */
  subscribe: (userId: string) => () => void;
  setState: (s: SafetyStateDb) => void;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  loading: true,
  error: null,

  /**
   * Carrega a viagem ativa.
   *
   * `loading` PRECISA voltar a false em todos os caminhos — inclusive quando a
   * consulta estoura ou a rede some. Uma tela de "Carregando…" que nunca sai é
   * pior que uma mensagem de erro: o usuário fica esperando algo que não vem e
   * não tem o que fazer.
   */
  async load() {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('travel_sessions')
        .select('*')
        .eq('status', 'active')
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ session: data, loading: false });

      // Depois de destravar a tela: o lembrete local é conveniência e não pode
      // segurar o render nem derrubar o load se as notificações falharem.
      if (data) {
        scheduleCheckinReminder(new Date(data.expected_checkin_at), data.id).catch((e) =>
          console.warn('[sentinela] lembrete local falhou:', e),
        );
      }
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  async checkIn() {
    const session = get().session;
    if (!session) return;

    // Atualização otimista: o botão precisa responder na hora, mesmo com
    // rede ruim. Se falhar, o load() reverte para o estado real.
    const optimistic = new Date().toISOString();
    set({ session: { ...session, last_signal_at: optimistic, state: 'safe' } });

    const { data, error } = await supabase.rpc('record_signal', {
      p_session_id: session.id,
      p_kind: 'manual_checkin',
      p_source: Platform.OS,
      p_device_id: (await getDeviceId()) ?? undefined,
    });

    if (error) {
      set({ error: error.message });
      await get().load();
      return;
    }

    set({ session: data as unknown as TravelSession });
    if (data) {
      await scheduleCheckinReminder(
        new Date((data as unknown as TravelSession).expected_checkin_at),
        session.id,
      );
    }
  },

  /**
   * Escuta criação, atualização e encerramento de viagens vindos de fora —
   * site, cron ou outro aparelho.
   *
   * BROADCAST, e não `postgres_changes`. A versão anterior usava
   * `postgres_changes` e simplesmente não entregava: com a tabela publicada, a
   * inscrição registrada no banco como `authenticated`, a RLS correta e o slot
   * de replicação ativo, o canal respondia SUBSCRIBED e nenhum evento chegava.
   * Um broadcast no mesmo canal, com o mesmo token, voltava na hora — o que
   * isolou o defeito na leitura do WAL, dentro da infraestrutura gerenciada.
   *
   * Agora quem emite é um gatilho no banco (`tg_broadcast_viagem`), pelo
   * caminho que funciona. O tópico é por usuário, então o servidor entrega só
   * a quem interessa em vez de espalhar e filtrar depois.
   */
  subscribe(userId) {
    const channel = supabase
      .channel(`viagens:${userId}`, { config: { private: true } })
      .on('broadcast', { event: 'INSERT' }, () => get().load())
      .on('broadcast', { event: 'UPDATE' }, () => get().load())
      .on('broadcast', { event: 'DELETE' }, () => get().load())
      .subscribe((status) => {
        // Canal privado depende de política em realtime.messages. Se ela sair
        // do ar o erro aparece aqui — e não como silêncio, que foi o que fez o
        // problema anterior demorar tanto para ser encontrado.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[sentinela] canal de viagens não autorizado:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  setState(s) {
    const session = get().session;
    if (session) set({ session: { ...session, state: s } });
  },
}));
