import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { supabase } from '../services/supabase';

export type ResumoProtecao = {
  /** Nomes dos contatos, em ordem de prioridade. */
  contatos: string[];
  /** O dossiê médico existe e tem conteúdo? */
  dossiePronto: boolean;
  /** Quantas vezes o dossiê foi aberto por alguém. */
  acessos: number;
};

/**
 * O estado da proteção, para mostrar na linha em vez de esconder atrás dela.
 *
 * Antes, saber se o dossiê estava preenchido, quantos contatos existiam ou se
 * alguém tinha aberto o dossiê exigia entrar em três telas. Numa lista de
 * ajustes onde só "Aparência" mostrava valor, a pessoa não tinha como auditar
 * a própria cobertura — e um contato faltando é a diferença entre o sistema
 * funcionar e não funcionar.
 *
 * As três consultas vão juntas porque são pequenas e usadas pelas mesmas duas
 * telas. Separadas, o Perfil dispararia três idas independentes à rede a cada
 * foco.
 */
export function useResumoProtecao() {
  const [resumo, setResumo] = useState<ResumoProtecao>({
    contatos: [],
    dossiePronto: false,
    acessos: 0,
  });

  const carregar = useCallback(async () => {
    const [contatos, dossie, acessos] = await Promise.all([
      supabase
        .from('emergency_contacts')
        .select('full_name')
        .order('priority', { ascending: true }),
      supabase
        .from('emergency_dossiers')
        .select('blood_type, allergies, medical_conditions, medications')
        .maybeSingle(),
      supabase
        .from('dossier_access_log')
        .select('id', { count: 'exact', head: true }),
    ]);

    const d = dossie.data;
    setResumo({
      contatos: (contatos.data ?? []).map((c) => c.full_name).filter(Boolean),
      // "Existe uma linha" não basta: o registro é criado vazio e ficaria
      // marcado como pronto sem nenhuma informação útil ao socorrista.
      dossiePronto: Boolean(
        d && (d.blood_type || d.allergies || d.medical_conditions || d.medications),
      ),
      acessos: acessos.count ?? 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return { resumo, recarregar: carregar };
}

/** "Ana e Pedro", "Ana, Pedro e mais 2", "ninguém ainda". */
export function listarContatos(nomes: string[]): string {
  const curtos = nomes.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
  if (curtos.length === 0) return 'ninguém ainda — cadastre um contato';
  if (curtos.length === 1) return curtos[0];
  if (curtos.length === 2) return `${curtos[0]} e ${curtos[1]}`;
  return `${curtos[0]}, ${curtos[1]} e mais ${curtos.length - 2}`;
}
