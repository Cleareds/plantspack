import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';

interface BrowseRowProps {
  title: string;
  subtitle: string;
  /** Optional green accent appended to the subtitle (e.g. "89 fully vegan"). */
  accent?: string;
  onPress: () => void;
}

export function BrowseRow({ title, subtitle, accent, onPress }: BrowseRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={accent ? `${title}. ${subtitle}, ${accent}` : `${title}. ${subtitle}`}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
          {accent ? <Text style={styles.accent}>{`  ·  ${accent}`}</Text> : null}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 60,
  },
  text: { flex: 1, gap: 3 },
  title: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: typography.sm, color: colors.textSecondary },
  accent: { color: colors.success, fontWeight: '600' },
});
