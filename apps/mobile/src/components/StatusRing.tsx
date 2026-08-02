import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { STATE_META, type SafetyState } from '@sentinela/shared';
import { stateColor, type as typo, useStyles, useColors, type Palette } from '../theme';

type Props = {
  state: SafetyState;
  lastSignalAt: string;
  expectedCheckinAt: string;
  size?: number;
};

/**
 * Anel de progresso do check-in.
 *
 * O contador regressivo é o elemento mais importante da Home: é ele que
 * transforma uma promessa abstrata ("alguém vai saber") em algo concreto
 * e verificável na tela.
 */
export function StatusRing({ state, lastSignalAt, expectedCheckinAt, size = 220 }: Props) {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(lastSignalAt).getTime();
  const end = new Date(expectedCheckinAt).getTime();
  const total = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(now - start, 0), total);
  const remaining = Math.max(end - now, 0);
  const progress = 1 - elapsed / total;

  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const color = stateColor[state] ?? c.idle;
  const meta = STATE_META[state];

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={c.surfaceAlt} strokeWidth={stroke} fill="none"
          />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </Svg>

        <View style={styles.center}>
          <Text style={[styles.label, { color }]}>{meta.short.toUpperCase()}</Text>
          <Text style={styles.countdown}>{formatRemaining(remaining)}</Text>
          <Text style={styles.hint}>
            {remaining > 0 ? 'até o próximo check-in' : 'check-in vencido'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{meta.description}</Text>
    </View>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  label: { ...typo.caption, letterSpacing: 1.6, marginBottom: 6 },
  countdown: { ...typo.display, color: c.text, fontVariant: ['tabular-nums'] },
  hint: { ...typo.small, color: c.textFaint, marginTop: 2 },
  description: {
    ...typo.small,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
