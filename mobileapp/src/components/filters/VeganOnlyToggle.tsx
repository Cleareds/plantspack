import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFilterStore } from '../../store/filterStore';
import { colors, radius, typography, spacing } from '../../constants/theme';

/** Global "100% Vegan only" vs "All places" segmented toggle. */
export function VeganOnlyToggle() {
  const veganOnly = useFilterStore((s) => s.veganOnly);
  const setVeganOnly = useFilterStore((s) => s.setVeganOnly);

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <TouchableOpacity
        style={[styles.seg, veganOnly && styles.segActive]}
        onPress={() => setVeganOnly(true)}
        accessibilityRole="button"
        accessibilityState={{ selected: veganOnly }}
      >
        <Text style={[styles.text, veganOnly && styles.textActive]}>🌱 100% Vegan</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.seg, !veganOnly && styles.segActive]}
        onPress={() => setVeganOnly(false)}
        accessibilityRole="button"
        accessibilityState={{ selected: !veganOnly }}
      >
        <Text style={[styles.text, !veganOnly && styles.textActive]}>All places</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seg: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  text: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, paddingHorizontal: spacing.sm },
  textActive: { color: colors.white },
});
