import { useState } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, type as typo } from '../theme';

export function CheckinButton({ onPress }: { onPress: () => Promise<void> }) {
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

const styles = StyleSheet.create({
  button: {
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: colors.safe },
  label: { ...typo.h1, color: '#fff' },
});
