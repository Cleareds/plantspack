import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFilterStore } from '../../store/filterStore';
import { CATEGORIES, SUBCATEGORIES, SORTS } from '../../constants/filters';
import { colors, spacing, radius, typography } from '../../constants/theme';

export function FilterModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { category, subcategory, petFriendly, sort, setCategory, setSubcategory, setPetFriendly, setSort, reset } =
    useFilterStore();

  const subs = category ? SUBCATEGORIES[category] : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={reset}><Text style={styles.reset}>Reset</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              <Chip label="All" active={!category} onPress={() => setCategory(null)} />
              {CATEGORIES.map((c) => (
                <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
              ))}
            </View>

            {/* Subcategory (depends on category) */}
            {subs && subs.length > 0 && (
              <>
                <Text style={styles.label}>Type</Text>
                <View style={styles.chips}>
                  <Chip label="Any" active={!subcategory} onPress={() => setSubcategory(null)} />
                  {subs.map((s) => (
                    <Chip key={s.value} label={s.label} active={subcategory === s.value} onPress={() => setSubcategory(s.value)} />
                  ))}
                </View>
              </>
            )}

            {/* Pet friendly */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🐾 Pet-friendly only</Text>
              <Switch value={petFriendly} onValueChange={setPetFriendly} trackColor={{ true: colors.primary }} />
            </View>

            {/* Sort */}
            <Text style={styles.label}>Sort by</Text>
            <View style={styles.chips}>
              {SORTS.map((s) => (
                <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Show places</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, maxHeight: '80%' },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  reset: { fontSize: typography.base, color: colors.primary, fontWeight: '600' },
  body: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  label: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.white },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  switchLabel: { fontSize: typography.base, color: colors.text, fontWeight: '500' },
  done: { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg, marginTop: spacing.md },
  doneText: { color: colors.white, fontWeight: '700', fontSize: typography.base },
});
