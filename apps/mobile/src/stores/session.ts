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
  subscribe: () => () => void;
  setState: (s: SafetyStateDb) => void;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  loading: true,
  error: null,

  async load() {
    set({ loading: true, error: null });
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
    if (data) await scheduleCheckinReminder(new Date(data.expected_checkin_at), data.id);
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

  /** Realtime: o estado muda no servidor (cron), não no app. */
  subscribe() {
    const session = get().session;
    if (!session) return () => {};

    const channel = supabase
      .channel(`session:${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'travel_sessions', filter: `id=eq.${session.id}` },
        (payload) => set({ session: payload.new as TravelSession }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  setState(s) {
    const session = get().session;
    if (session) set({ session: { ...session, state: s } });
  },
}));
