import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { scan, toDataUrl, ScanResult } from '../../src/lib/toolScan';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const VERDICT = {
  vegan: { color: '#16a34a', label: 'Looks vegan', bg: '#f0fdf4' },
  not_vegan: { color: '#dc2626', label: 'Not vegan', bg: '#fef2f2' },
  uncertain: { color: '#d97706', label: 'Uncertain - check the label', bg: '#fffbeb' },
  unclear: { color: '#6b7280', label: "Couldn't read the label", bg: '#f9fafb' },
  invalid_image: { color: '#6b7280', label: "That doesn't look like an ingredient list", bg: '#f9fafb' },
} as const;

const STATUS_COLOR = { vegan: '#16a34a', uncertain: '#d97706', not_vegan: '#dc2626' };

export default function IngredientScannerScreen() {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async (fromCamera: boolean) => {
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true, allowsEditing: true });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setImageUri(asset.uri);
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      setResult(await scan({ tool: 'ingredient', imageDataUrls: [toDataUrl(asset.base64 ?? '')] }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setImageUri(null); setResult(null); setError(null); };

  const v = result ? (VERDICT[result.verdict] ?? VERDICT.unclear) : null;
  const flagged = result?.items?.filter((i) => i.status !== 'vegan') ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ingredient Scanner</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!imageUri ? (
          <View style={styles.pickState}>
            <View style={styles.iconBox}><Ionicons name="camera-outline" size={56} color={colors.primary} /></View>
            <Text style={styles.pickTitle}>Scan ingredient label</Text>
            <Text style={styles.pickText}>Take a photo or pick from your library - AI flags hidden animal-derived ingredients.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage(true)}>
              <Ionicons name="camera" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Choose from library</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultState}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />

            {loading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Analyzing ingredients...</Text>
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

                {flagged.length > 0 && (
                  <View style={styles.flaggedCard}>
                    <Text style={styles.flaggedTitle}>Worth checking:</Text>
                    {flagged.map((item, i) => (
                      <View key={i} style={styles.flaggedItem}>
                        <Text style={[styles.flaggedIngredient, { color: STATUS_COLOR[item.status] }]}>• {item.name}</Text>
                        {item.note ? <Text style={styles.flaggedReason}>{item.note}</Text> : null}
                      </View>
                    ))}
                  </View>
                )}

                {result.eCodeHits && result.eCodeHits.length > 0 && (
                  <View style={styles.flaggedCard}>
                    <Text style={styles.flaggedTitle}>E-numbers detected:</Text>
                    {result.eCodeHits.map((h, i) => (
                      <View key={i} style={styles.flaggedItem}>
                        <Text style={styles.flaggedIngredient}>{h.code} - {h.name}</Text>
                        <Text style={styles.flaggedReason}>{h.note}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.scanAgainButton} onPress={reset}>
              <Ionicons name="camera-outline" size={18} color={colors.white} />
              <Text style={styles.scanAgainText}>Scan another label</Text>
            </TouchableOpacity>
          </View>
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
  content: { padding: spacing.md, gap: spacing.md },
  pickState: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  iconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  pickTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  pickText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.lg },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.md, width: '100%', justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.xl, paddingVertical: 14,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, width: '100%', justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '600', fontSize: typography.base },
  resultState: { gap: spacing.md },
  previewImage: { width: '100%', height: 200, borderRadius: radius.md },
  loadingCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.md, backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg },
  loadingText: { color: colors.textSecondary, fontSize: typography.base },
  errorCard: {
    padding: spacing.md, backgroundColor: '#fef2f2', borderRadius: radius.lg, borderWidth: 1, borderColor: '#fecaca',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  errorText: { flex: 1, color: colors.error },
  retryText: { color: colors.error, fontWeight: '700', marginLeft: spacing.md },
  verdictCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, gap: 6 },
  verdictLabel: { fontSize: typography.xl, fontWeight: '800' },
  summary: { fontSize: typography.base, color: colors.text, lineHeight: 21 },
  flaggedCard: { padding: spacing.md, backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  flaggedTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  flaggedItem: { gap: 2 },
  flaggedIngredient: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  flaggedReason: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 18 },
  scanAgainButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, padding: 14, borderRadius: radius.md,
  },
  scanAgainText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
});
