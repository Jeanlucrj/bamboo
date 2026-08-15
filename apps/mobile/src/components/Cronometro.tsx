import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { STATE_META, type SafetyState } from '@sentinela/shared';

import { Sobre, BarraEscada } from './Pecas';
import { horasDoIntervalo, formatarRestante } from '../utils/tempo';
import { spacing, type as typo, useColors } from '../theme';

type Props = {
  state: SafetyState;
  lastSignalAt: string;
  expectedCheckinAt: string;
  /** Intervalos crus do Postgres, como vêm de `travel_sessions`. */
  gracePeriod: string;
  alertDelay: string;
};

/**
 * O cronômetro, agora como número herói.
 *
 * SUBSTITUI O ANEL (`StatusRing`), que gastava 220px de altura — quase metade
 * da tela útil — para dizer o que o número diz sozinho.
 *
 * O anel tinha uma justificativa: mostrar a fração de tempo consumida. Só que
 * essa fração não é a informação que a pessoa procura. Ela quer saber quanto
 * falta e o que acontece depois, e as duas respostas cabem em texto. Pior: o
 * anel expressava só o primeiro degrau (até o check-in), e portanto ficava
 * cheio de novo a cada estado — dando a impressão de que o relógio tinha
 * voltado ao começo justamente quando a situação piorava.
 *
 * A barra segmentada abaixo faz o que o anel não fazia: mostra a escada
 * inteira, do check-in até os contatos serem acionados, e onde a pessoa está
 * nela. É a informação que o sistema sempre teve e nunca mostrou.
 *
 * O estado vira a COR do número. Uma linha de texto a menos, e a cor é lida
 * antes de qualquer palavra.
 */
export function Cronometro({
  state, lastSignalAt, expectedCheckinAt, gracePeriod, alertDelay,
}: Props) {
  const c = useColors();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    // De minuto em minuto, e não de segundo em segundo como o anel fazia.
    // O formato não mostra segundos, então 59 dos 60 quadros por minuto
    // redesenhavam a tela para escrever exatamente o mesmo texto — com o app
    // em primeiro plano isso é bateria queimada à toa.
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const corEstado: Record<SafetyState, string> = {
    safe: c.safe,
    grace: c.grace,
    warning: c.warning,
    alert: c.alert,
    sos: c.sos,
    resolved: c.resolved,
  };
  const cor = corEstado[state] ?? c.idle;

  const checkin = new Date(expectedCheckinAt).getTime();
  const horasGraca = horasDoIntervalo(gracePeriod);
  const horasAlerta = horasDoIntervalo(alertDelay);

  const fimGraca = checkin + horasGraca * 3_600_000;
  const fimAlerta = fimGraca + horasAlerta * 3_600_000;

  // Qual degrau está correndo, e quanto falta para o fim DELE. Fora do estado
  // do banco de propósito: o `state` é recalculado pelo cron e pode estar
  // alguns minutos atrás do relógio do aparelho. Aqui o que importa é o que a
  // pessoa vê acontecendo agora.
  const degrau = agora < checkin ? 0 : agora < fimGraca ? 1 : agora < fimAlerta ? 2 : 3;
  const alvo = degrau === 0 ? checkin : degrau === 1 ? fimGraca : fimAlerta;
  const restante = Math.max(alvo - agora, 0);

  const rotulo =
    degrau === 0 ? 'Próximo check-in em'
    : degrau === 1 ? 'Antes de insistirmos'
    : degrau === 2 ? 'Antes de acionarmos seus contatos'
    : 'Seus contatos foram acionados';

  const aSeguir =
    degrau === 0 ? 'Avisamos só você — mais ninguém.'
    : degrau === 1 ? 'Insistimos por push e SMS. Ainda só para você.'
    : degrau === 2 ? 'Seus contatos de emergência recebem o Dossiê.'
    : STATE_META[state].description;

  // Pesos proporcionais à duração real de cada degrau: um período de graça de
  // 1h ao lado de 24h de check-in não pode ocupar um terço da barra.
  const horasCheckin = Math.max(
    (checkin - new Date(lastSignalAt).getTime()) / 3_600_000,
    1,
  );

  return (
    <View>
      {/* O NOME DO ESTADO CONTINUA ESCRITO, e não só pintado.
          A cor do número é o sinal mais rápido, mas ela sozinha não serve para
          quem não distingue verde de âmbar — e num app de segurança "estou
          coberto ou não" não pode depender de enxergar tom. */}
      <Sobre cor={cor}>{STATE_META[state].label}</Sobre>

      <Text
        style={{
          ...typo.hero,
          color: degrau === 3 ? c.alert : cor,
          marginTop: 4,
          fontVariant: ['tabular-nums'],
        }}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {degrau === 3 ? STATE_META[state].label : formatarRestante(restante)}
      </Text>
      <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 2 }}>
        {rotulo.toLowerCase()}
      </Text>

      <View style={{ marginTop: spacing.md }}>
        <Sobre>A seguir</Sobre>
        <Text style={{ ...typo.small, color: c.textMuted, marginTop: 2, lineHeight: 19 }}>
          {aSeguir}
        </Text>
      </View>

      <View style={{ marginTop: spacing.md }}>
        <BarraEscada
          segmentos={[horasCheckin, horasGraca, horasAlerta]}
          ativo={Math.min(degrau, 2)}
          cor={cor}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Sobre>Você</Sobre>
          <Sobre>Push + SMS</Sobre>
          <Sobre>Contatos</Sobre>
        </View>
      </View>
    </View>
  );
}
