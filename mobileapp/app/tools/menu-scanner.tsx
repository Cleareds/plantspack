import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { scan, toDataUrl, ScanResult } from '../../src/lib/toolScan';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const VERDICT = {
  vegan: { color: '#16a34a', label: 'Vegan-friendly menu', bg: '#f0fdf4' },
  uncertain: { color: '#d97706', label: 'Some options - ask the server', bg: '#fffbeb' },
  not_vegan: { color: '#dc2626', label: 'No clear vegan options', bg: '#fef2f2' },
  unclear: { color: '#6b7280', label: "Couldn't read the menu", bg: '#f9fafb' },
  invalid_image: { color: '#6b7280', label: "That doesn't look like a menu", bg: '#f9fafb' },
} as const;

const ITEM = {
  vegan: { color: '#16a34a', icon: 'checkmark-circle' as const },
  uncertain: { color: '#d97706', icon: 'help-circle' as const },
  not_vegan: { color: '#dc2626', icon: 'close-circle' as const },
};

export default function MenuScannerScreen() {
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'choose' | 'text'>('choose');
  const [text, setText] = useState('');

  const run = async (fn: () => Promise<ScanResult>) => {
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await fn());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async (fromCamera: boolean) => {
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7, base64: true, allowsMultipleSelection: true, selectionLimit: 5,
        });
    if (res.canceled || !res.assets.length) return;
    const urls = res.assets.map((a) => toDataUrl(a.base64 ?? '')).filter((u) => u.length > 30).slice(0, 5);
    if (urls.length) run(() => scan({ tool: 'menu', imageDataUrls: urls }));
  };

  const scanText = () => {
    if (text.trim().length < 20) { setError('Paste at least a few menu lines.'); return; }
    run(() => scan({ tool: 'menu', text: text.trim() }));
  };

  const reset = () => { setResult(null); setError(null); setText(''); setMode('choose'); };

  const v = result ? (VERDICT[result.verdict] ?? VERDICT.unclear) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Menu Scanner</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!result && !loading && (
          <>
            <View style={styles.iconBox}><Ionicons name="restaurant-outline" size={48} color={colors.primary} /></View>
            <Text style={styles.pickTitle}>Is this menu vegan-friendly?</Text>
            <Text style={styles.pickText}>
              Photograph a menu (any language) and AI highlights vegan dishes, flags what to ask about, and suggests swaps.
            </Text>

            {mode === 'choose' ? (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={() => pickImages(true)}>
                  <Ionicons name="camera" size={18} color={colors.white} />
                  <Text style={styles.primaryButtonText}>Take a photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImages(false)}>
                  <Ionicons name="images-outline" size={18} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Choose photos (up to 5)</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('text')}>
                  <Text style={styles.linkText}>Or paste menu text</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.textArea}
                  placeholder="Paste the menu text here..."
                  placeholderTextColor={colors.textLight}
                  value={text}
                  onChangeText={setText}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={scanText}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.white} />
                  <Text style={styles.primaryButtonText}>Check menu</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('choose')}>
                  <Text style={styles.linkText}>Use a photo instead</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Reading the menu...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={reset}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        )}

        {result && v && !loading && (
          <>
            <View style={[styles.verdictCard, { backgroundColor: v.bg, borderColor: v.color }]}>
              <Text style={[styles.verdictLabel, { color: v.color }]}>{v.label}</Text>
              {result.summary ? <Text style={styles.summary}>{result.summary}</Text> : null}
            </View>

            {result.visibility && result.visibility.fully_readable === false && result.visibility.issues ? (
              <View style={styles.noteCard}>
                <Ionicons name="eye-off-outline" size={16} color={colors.warning} />
                <Text style={styles.noteText}>{result.visibility.issues}</Text>
              </View>
            ) : null}

            {result.items && result.items.length > 0 && (
              <View style={styles.itemsWrap}>
                {result.items.map((item, i) => {
                  const ic = ITEM[item.status] ?? ITEM.uncertain;
                  return (
                    <View key={i} style={styles.item}>
                      <Ionicons name={ic.icon} size={18} color={ic.color} style={styles.itemIcon} />
                      <View style={styles.itemBody}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={reset}>
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Scan another menu</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  content: { padding: spacing.md, gap: spacing.md, alignItems: 'stretch' },
  iconBox: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: spacing.lg,
  },
  pickTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  pickText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md,
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary,
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '600', fontSize: typography.base },
  linkText: { color: colors.textSecondary, fontSize: typography.base, textAlign: 'center', paddingVertical: spacing.sm },
  textArea: {
    minHeight: 160, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: typography.base, color: colors.text, backgroundColor: colors.backgroundSecondary,
  },
  loadingCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.md, backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, marginTop: spacing.xl },
  loadingText: { color: colors.textSecondary, fontSize: typography.base },
  errorCard: {
    padding: spacing.md, backgroundColor: '#fef2f2', borderRadius: radius.lg, borderWidth: 1, borderColor: '#fecaca',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg,
  },
  errorText: { flex: 1, color: colors.error },
  retryText: { color: colors.error, fontWeight: '700', marginLeft: spacing.md },
  verdictCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, gap: 6 },
  verdictLabel: { fontSize: typography.lg, fontWeight: '800' },
  summary: { fontSize: typography.base, color: colors.text, lineHeight: 21 },
  noteCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: spacing.md,
    backgroundColor: '#fffbeb', borderRadius: radius.md, borderWidth: 1, borderColor: '#fde68a',
  },
  noteText: { flex: 1, fontSize: typography.sm, color: '#92400e', lineHeight: 19 },
  itemsWrap: { gap: 2 },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start' },
  itemIcon: { marginTop: 1 },
  itemBody: { flex: 1, gap: 2 },
  itemName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  itemNote: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 18 },
});
