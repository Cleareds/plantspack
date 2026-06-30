import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { pickAndUploadImages } from '../../lib/imageUpload';
import { colors, spacing, radius, typography } from '../../constants/theme';

/**
 * Optional photo picker. Uploads to the shared post-images bucket and reports
 * the resulting public URLs via onChange. Shows thumbnails with remove buttons.
 * Adding photos is never required — the surrounding form works without it.
 */
export function PhotoPicker({
  value,
  onChange,
  max = 5,
  label = 'Add photos',
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
}) {
  const { user } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const remaining = max - value.length;

  const add = async () => {
    if (!user || remaining <= 0 || busy) return;
    setBusy(true);
    const { urls, failed } = await pickAndUploadImages(user.id, remaining);
    setBusy(false);
    if (urls.length) onChange([...value, ...urls].slice(0, max));
    if (failed) Alert.alert('Some photos failed', `${failed} photo${failed > 1 ? 's' : ''} couldn’t be uploaded. Please try again.`);
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {value.map((url) => (
          <View key={url} style={styles.thumbWrap}>
            <Image source={{ uri: url }} style={styles.thumb} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => remove(url)} accessibilityLabel="Remove photo">
              <Ionicons name="close" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
        ))}
        {remaining > 0 && (
          <TouchableOpacity style={styles.addBtn} onPress={add} disabled={busy} accessibilityLabel={label}>
            {busy ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.addText}>Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.hint}>Optional · up to {max} · {value.length}/{max} added</Text>
    </View>
  );
}

const SIZE = 74;
const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: SIZE, height: SIZE, borderRadius: radius.md, overflow: 'hidden' },
  thumb: { width: SIZE, height: SIZE, backgroundColor: colors.backgroundSecondary },
  removeBtn: { position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: SIZE, height: SIZE, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addText: { fontSize: typography.xs, color: colors.textSecondary },
  hint: { fontSize: typography.xs, color: colors.textLight },
});
