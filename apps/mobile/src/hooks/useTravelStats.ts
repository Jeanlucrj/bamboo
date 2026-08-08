import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { TravelStats, TripHistoryItem } from '@sentinela/shared';
import { supabase } from '../services/supabase';

/**
 * Lê mv_user_travel_stats via RPC (materialized view não suporta RLS,
 * então o filtro por auth.uid() mora dentro da função SECURITY DEFINER).
 *
 * Os números são atualizados de hora em hora pelo cron `refresh-analytics`.
 * Somar ST_Distance sobre location_logs a cada abertura de tela seria
 * inviável na tabela que mais cresce do sistema.
 */
export function useTravelStats() {
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase.rpc('get_my_travel_stats');
      if (!alive) return;
      if (error) setError(error.message);
      else setStats((data as TravelStats[])?.[0] ?? null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { stats, loading, error };
}

/**
 * Histórico de viagens.
 *
 * Recarrega a cada foco da tela: voltar de "encerrar viagem" tem que refletir
 * o status novo, e a lista é curta o bastante para não valer cache.
 */
export function useTripHistory() {
  const [trips, setTrips] = useState<TripHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_my_trip_history');
    if (error) setError(error.message);
    else {
      setError(null);
      setTrips((data ?? []) as TripHistoryItem[]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return { trips, loading, error, recarregar: carregar };
}

export type CountryVisitItem = {
  country_code: string;
  entered_at: string;
  left_at: string;
  duration: string;
};

/** Timeline de países visitados, para o diário de bordo. */
export function useCountryVisits() {
  const [visits, setVisits] = useState<CountryVisitItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('v_user_country_visits')
        .select('country_code, entered_at, left_at, duration')
        .order('entered_at', { ascending: false });
      if (!alive) return;

      // A view agrupa pings, então o Postgres tipa todas as colunas como
      // nuláveis mesmo com o group by garantindo valor. Descartar a linha
      // incompleta é melhor que renderizar "undefined" na timeline do diário —
      // e sem país a entrada não significa nada de qualquer forma.
      setVisits(
        (data ?? []).filter(
          (v): v is CountryVisitItem =>
            v.country_code !== null &&
            v.entered_at !== null &&
            v.left_at !== null &&
            v.duration !== null,
        ),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { visits, loading };
}
