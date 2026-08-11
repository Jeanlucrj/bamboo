import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { TravelStats, TripHistoryItem } from '@sentinela/shared';
import { supabase } from '../services/supabase';

/**
 * Lê mv_user_travel_stats via RPC (materialized view não suporta RLS,
 * então o filtro por auth.uid() mora dentro da função SECURITY DEFINER).
 *
 * Os números são recalculados de hora em hora pelo cron `refresh-analytics`.
 * Somar ST_Distance sobre location_logs a cada abertura de tela seria inviável
 * na tabela que mais cresce do sistema.
 *
 * RECARREGA A CADA FOCO, e antes não recarregava nunca.
 *
 * Era `useEffect(..., [])`: buscava uma vez, na montagem. Só que aba de
 * navegação por baixo fica MONTADA em memória — trocar de aba e voltar não
 * remonta nada. Na prática os números congelavam até o app ser fechado por
 * completo.
 *
 * E o efeito colateral era pior que dado velho: `useTripHistory`, na mesma
 * tela, recarrega por foco. Então "Minhas viagens" mostrava a contagem nova
 * enquanto países, cidades e quilômetros mostravam a antiga — dois números
 * discordando lado a lado, o que faz o usuário duvidar dos dois.
 */
export function useTravelStats() {
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_my_travel_stats');
    if (error) setError(error.message);
    else {
      setError(null);
      setStats((data as TravelStats[])?.[0] ?? null);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return { stats, loading, error, recarregar: carregar };
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
  city: string | null;
  trip_title: string | null;
  entered_at: string;
  left_at: string;
  duration: string;
};

/**
 * Timeline de lugares visitados.
 *
 * Agora por CIDADE (`v_user_place_visits`), não por país. A de país mostrava
 * um bloco só para quem não sai do próprio país — três dias de deslocamento
 * entre cidades viravam uma linha parada, com a data de entrada no topo. Era
 * isso que parecia "timeline travada".
 *
 * O dado vem de view normal, sempre atual, sem esperar o cron das estatísticas.
 */
export function useCountryVisits() {
  const [visits, setVisits] = useState<CountryVisitItem[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('v_user_place_visits')
      .select('country_code, city, trip_title, entered_at, left_at, duration')
      .order('entered_at', { ascending: false });

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return { visits, loading, recarregar: carregar };
}
