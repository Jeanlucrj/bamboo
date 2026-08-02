import { View, Text, StyleSheet } from 'react-native';
import { radius, spacing, type as typo, useStyles, useColors, type Palette } from '../theme';

type Props = { value: string | number; label: string; hint?: string; accent?: string };

export function StatCard({ value, label, hint, accent }: Props) {
  const c = useColors();
  const styles = useStyles(criarEstilos);
  // O padrão precisa ser resolvido AQUI, não na assinatura: valor padrão de
  // parâmetro é avaliado antes do corpo, quando `c` ainda não existe.
  const cor = accent ?? c.brandLight;

  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: cor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const criarEstilos = (c: Palette) => StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
  },
  value: { ...typo.h1, fontVariant: ['tabular-nums'] },
  label: { ...typo.small, color: c.textMuted, marginTop: 2 },
  hint: { ...typo.caption, color: c.textFaint, marginTop: 4 },
});
