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
    height: 68,
    // Pílula, como os demais botões do desenho novo. O SOS é o único que
    // continua preenchido de vermelho: em pânico ninguém lê rótulo, lê cor e
    // posição, e um contorno vermelho sobre preto não tem a mesma urgência.
    borderRadius: radius.pill,
    backgroundColor: c.sos,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  // O preenchimento do progresso corre em branco translúcido por cima do
  // vermelho. Antes o botão era quase preto e o vermelho é que avançava — o
  // que fazia o estado de repouso parecer desligado.
  fill: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  content: { alignItems: 'center' },
  title: { ...typo.h2, color: '#fff', letterSpacing: 3, fontWeight: '800' },
  subtitle: { ...typo.caption, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
