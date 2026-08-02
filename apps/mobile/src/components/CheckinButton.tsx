import { useState } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { radius, type as typo, useStyles, type Palette } from '../theme';

export function CheckinButton({ onPress }: { onPress: () => Promise<void> }) {
  const styles = useStyles(criarEstilos);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handle() {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await onPress();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={handle}
      disabled={busy}
      style={({ pressed }) => [
        styles.button,
        done && styles.done,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>{done ? '✓  Registrado' : 'Estou bem'}</Text>
      )}
    </Pressable>
  );
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  button: {
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: c.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: c.safe },
  label: { ...typo.h1, color: '#fff' },
});
