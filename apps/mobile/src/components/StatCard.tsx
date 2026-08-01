import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, type as typo } from '../theme';

type Props = { value: string | number; label: string; hint?: string; accent?: string };

export function StatCard({ value, label, hint, accent = colors.brandLight }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  value: { ...typo.h1, fontVariant: ['tabular-nums'] },
  label: { ...typo.small, color: colors.textMuted, marginTop: 2 },
  hint: { ...typo.caption, color: colors.textFaint, marginTop: 4 },
});
