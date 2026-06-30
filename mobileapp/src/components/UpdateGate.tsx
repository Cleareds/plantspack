import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVersionGate } from '../lib/appVersion';
import { colors, spacing, radius, typography } from '../constants/theme';

/**
 * App-version prompt driven by the remote app_release_config (App-Store-safe:
 * informational, links to the store — never an OTA self-update).
 *   - forced: full-screen blocking screen below the minimum supported version.
 *   - soft:   a dismissible top banner when a newer version exists.
 * Renders nothing when up to date. Mounted once at the app root.
 */
export function UpdateGate() {
  const insets = useSafeAreaInsets();
  const { status, message, storeUrl } = useVersionGate();
  const [dismissed, setDismissed] = useState(false);

  const openStore = () => { if (storeUrl) Linking.openURL(storeUrl); };

  if (status === 'forced') {
    return (
      <Modal visible animationType="fade" transparent={false}>
        <View style={[styles.forced, { paddingTop: insets.top + spacing.xl }]}>
          <Ionicons name="rocket-outline" size={72} color={colors.primary} />
          <Text style={styles.forcedTitle}>Time to update</Text>
          <Text style={styles.forcedText}>
            {message || 'This version of PlantsPack is no longer supported. Update to keep going.'}
          </Text>
          <TouchableOpacity style={styles.forcedBtn} onPress={openStore}>
            <Text style={styles.forcedBtnText}>Update now</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (status === 'soft' && !dismissed) {
    return (
      <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.bannerText} numberOfLines={2}>
          {message || 'A new version of PlantsPack is available.'}
        </Text>
        <TouchableOpacity onPress={openStore} accessibilityLabel="Update PlantsPack">
          <Text style={styles.bannerAction}>Update</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDismissed(true)} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  forced: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  forcedTitle: { fontSize: typography.xxl, fontWeight: '800', color: colors.text },
  forcedText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  forcedBtn: { marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: 15, borderRadius: radius.md },
  forcedBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.md },

  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  bannerText: { flex: 1, fontSize: typography.sm, color: colors.text, lineHeight: 18 },
  bannerAction: { fontSize: typography.sm, fontWeight: '700', color: colors.primary, paddingHorizontal: 4 },
});
