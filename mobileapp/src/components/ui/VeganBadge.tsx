import { View, Text, StyleSheet } from 'react-native';
import { VEGAN_COLORS, VEGAN_LABELS, VeganLevel } from '../../constants/veganColors';
import { radius, typography, spacing } from '../../constants/theme';

interface VeganBadgeProps {
  level: string | null;
  size?: 'sm' | 'md';
}

export function VeganBadge({ level, size = 'md' }: VeganBadgeProps) {
  const key = (level ?? 'unknown') as VeganLevel;
  const color = VEGAN_COLORS[key] ?? VEGAN_COLORS.unknown;
  const label = VEGAN_LABELS[key] ?? 'Unknown';

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }, size === 'sm' && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }, size === 'sm' && styles.smText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  smText: {
    fontSize: typography.xs,
  },
});
