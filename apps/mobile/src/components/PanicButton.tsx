import { useRef, useState } from 'react';
import { Pressable, Text, View, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { radius, type as typo, useStyles, type Palette } from '../theme';

const HOLD_MS = 3000;

/**
 * Botão de pânico com press-and-hold de 3 s.
 *
 * Toque simples está fora de questão: o telefone fica no bolso, na mochila,
 * na mão de uma criança. Um SOS acidental que aciona a família inteira é o
 * tipo de erro que faz desinstalar o app. O anel de progresso dá ao usuário
 * a chance de soltar antes de disparar.
 */
export function PanicButton({ onTrigger }: { onTrigger: () => void }) {
  const styles = useStyles(criarEstilos);
  const [holding, setHolding] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulses = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Vibração crescente: feedback tátil de que algo sério está acontecendo,
    // mesmo sem olhar para a tela.
    pulses.current = setInterval(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      400,
    );

    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    timer.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      cleanup();
      onTrigger();
    }, HOLD_MS);
  }

  function cancel() {
    cleanup();
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  }

  function cleanup() {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
    if (pulses.current) clearInterval(pulses.current);
    timer.current = null;
    pulses.current = null;
  }

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable onPressIn={start} onPressOut={cancel} style={styles.wrapper}>
      <View style={styles.button}>
        <Animated.View style={[styles.fill, { width }]} />
        <View style={styles.content}>
          <Text style={styles.title}>SOS</Text>
          <Text style={styles.subtitle}>
            {holding ? 'Segure para acionar…' : 'Mantenha pressionado por 3 segundos'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  wrapper: { width: '100%' },
  button: {
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: '#3F1416',
    borderWidth: 1.5,
    borderColor: c.alert,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { ...StyleSheet.absoluteFillObject, right: undefined, backgroundColor: c.alert },
  content: { alignItems: 'center' },
  title: { ...typo.h1, color: '#fff', letterSpacing: 4 },
  subtitle: { ...typo.caption, color: '#FCA5A5', marginTop: 2 },
});
