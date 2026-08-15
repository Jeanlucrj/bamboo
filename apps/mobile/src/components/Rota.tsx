import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Path, Circle, G } from 'react-native-svg';

import { Sobre } from './Pecas';
import { supabase } from '../services/supabase';
import { spacing, radius, type as typo, useColors } from '../theme';

const ALTURA = 150;

/**
 * O trajeto da viagem, desenhado na aba Segurança.
 *
 * A função `get_session_track` existe desde a primeira migration e NUNCA FOI
 * CHAMADA por tela alguma. Gravávamos cada ponto de GPS desde o primeiro dia,
 * simplificávamos a linha no banco, devolvíamos GeoJSON pronto — e o usuário
 * nunca viu nada disso. O app parecia parado justamente por esconder a única
 * coisa que se move nele.
 *
 * Sem Mapbox de propósito. Um mapa de tiles precisa de rede para a primeira
 * pintura, de chave de API e de mensalidade por carregamento; e esta é uma tela
 * aberta em região sem sinal, que é quando ela mais importa. O que interessa
 * aqui é a FORMA do deslocamento — se a linha anda ou está parada — e isso o
 * traçado sozinho entrega, offline e instantâneo.
 *
 * A grade atrás não é geográfica: é referência visual para o traço não flutuar
 * no vazio. Não fingimos ruas que não conhecemos.
 */
export function Rota({ sessionId }: { sessionId: string }) {
  const c = useColors();
  const [pontos, setPontos] = useState<[number, number][] | null>(null);
  const [carregou, setCarregou] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;

      supabase
        .rpc('get_session_track', { p_session_id: sessionId, p_tolerance_m: 50 })
        .then(({ data }) => {
          if (!vivo) return;
          setPontos(extrair(data));
          setCarregou(true);
        });

      return () => {
        vivo = false;
      };
    }, [sessionId]),
  );

  // Enquanto não carregou não reserva espaço: um retângulo cinza de 150px
  // aparecendo e sumindo empurra o botão "Estou bem" para baixo no exato
  // momento em que a pessoa vai tocar nele.
  if (!carregou) return null;

  const traco = normalizar(pontos);

  return (
    <View
      style={{
        height: ALTURA,
        borderRadius: radius.bloco,
        backgroundColor: c.surface,
        overflow: 'hidden',
      }}
    >
      <Svg width="100%" height={ALTURA} viewBox="0 0 290 150">
        <G stroke={c.surfaceAlt} strokeWidth={1.2} fill="none">
          <Path d="M-5 40 H295 M-5 92 H295 M40 -5 V155 M118 -5 V155 M205 -5 V155" />
        </G>

        {traco ? (
          <>
            <Path d={traco.d} fill="none" stroke={c.brandLight} strokeWidth={3.2}
              strokeLinecap="round" strokeLinejoin="round" />
            {/* Halo + ponto: a posição mais recente precisa ser encontrada num
                relance, e um círculo de 6px sozinho some sobre a linha. */}
            <Circle cx={traco.fimX} cy={traco.fimY} r={16} fill={c.safe} opacity={0.16} />
            <Circle cx={traco.fimX} cy={traco.fimY} r={6.5} fill={c.safe}
              stroke={c.surface} strokeWidth={2.5} />
          </>
        ) : null}
      </Svg>

      <View style={{ position: 'absolute', left: spacing.md, bottom: spacing.sm + 2 }}>
        {traco ? (
          <Sobre>{traco.pontos} pontos registrados</Sobre>
        ) : (
          <Text style={{ ...typo.caption, color: c.textFaint }}>
            O trajeto aparece no primeiro deslocamento.
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * GeoJSON -> lista de coordenadas.
 *
 * `ST_MakeLine` sobre um único ponto devolve um Point, não um LineString, e com
 * zero pontos devolve null. Os três casos chegam aqui e nenhum pode explodir a
 * aba principal do app.
 */
function extrair(data: unknown): [number, number][] | null {
  if (!data || typeof data !== 'object') return null;
  const g = data as { type?: string; coordinates?: unknown };

  if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
    return g.coordinates.filter(
      (p): p is [number, number] =>
        Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number',
    );
  }
  if (g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    return [[g.coordinates[0] as number, g.coordinates[1] as number]];
  }
  return null;
}

/**
 * Coordenadas geográficas -> caminho SVG, com margem e proporção preservada.
 *
 * Esticar cada eixo para preencher a caixa faria um deslocamento de 200 km para
 * o norte e 2 km para o leste virar uma diagonal a 45° — mentira sobre a forma
 * do trajeto. A mesma escala nos dois eixos mantém a silhueta real.
 *
 * A latitude é invertida porque em SVG o Y cresce para baixo e no mundo o norte
 * fica em cima.
 */
function normalizar(pontos: [number, number][] | null) {
  if (!pontos || pontos.length === 0) return null;

  const M = 26;
  const L = 290 - M * 2;
  const A = 150 - M * 2;

  const lngs = pontos.map((p) => p[0]);
  const lats = pontos.map((p) => p[1]);
  const minX = Math.min(...lngs), maxX = Math.max(...lngs);
  const minY = Math.min(...lats), maxY = Math.max(...lats);

  const larg = maxX - minX;
  const alt = maxY - minY;
  // Ponto único ou trajeto degenerado: centraliza em vez de dividir por zero.
  const escala = larg === 0 && alt === 0 ? 0 : Math.min(larg ? L / larg : Infinity, alt ? A / alt : Infinity);

  const projetados = pontos.map(([x, y]) => {
    const px = M + (larg ? (x - minX) * escala : L / 2) + (larg ? (L - larg * escala) / 2 : 0);
    const py = M + (alt ? (maxY - y) * escala : A / 2) + (alt ? (A - alt * escala) / 2 : 0);
    return [px, py] as const;
  });

  const d = projetados
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const fim = projetados[projetados.length - 1];
  return { d, fimX: fim[0], fimY: fim[1], pontos: pontos.length };
}
