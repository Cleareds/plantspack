import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

// www is canonical; plantspack.com 301-redirects, so hit www directly.
const API_BASE = 'https://www.plantspack.com';

interface ECodeHit { code: string; name: string; status: string; note?: string }
interface CosmeticHit { name: string; status: string }
interface BarcodeResult {
  barcode: string;
  verdict: 'vegan' | 'not_vegan' | 'uncertain' | 'not_found';
  reason: string;
  productName: string | null;
  brand: string | null;
  imageUrl: string | null;
  nonVeganHits: string[];
  allergenHits: string[];
  eCodeHits: ECodeHit[];
  cosmeticHits?: CosmeticHit[];
  kind: 'food' | 'cosmetics';
}

const VERDICT = {
  vegan: { color: '#16a34a', label: 'Vegan ✓', bg: '#f0fdf4' },
  not_vegan: { color: '#dc2626', label: 'Not vegan ✗', bg: '#fef2f2' },
  uncertain: { color: '#d97706', label: 'Uncertain - check the label', bg: '#fffbeb' },
  not_found: { color: '#6b7280', label: 'Not in the database yet', bg: '#f9fafb' },
} as const;

export default function BarcodeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'food' | 'cosmetics'>('food');
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanned = useRef(false);

  const handleBarcodeScan = async ({ data: code }: { data: string }) => {
    if (scanned.current || loading || result) return;
    scanned.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tools/barcode?barcode=${encodeURIComponent(code)}&kind=${mode}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Lookup failed');
      setResult(json as BarcodeResult);
    } catch (e: any) {
      setError(e.message);
      scanned.current = false; // allow retry
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    scanned.current = false;
  };

  const shareResult = () => {
    if (!result) return;
    const v = VERDICT[result.verdict];
    const name = result.productName ?? `Barcode ${result.barcode}`;
    Share.share({
      message: `${name}${result.brand ? ` (${result.brand})` : ''} — ${v.label}. ${result.reason}\n\nChecked with PlantsPack: https://plantspack.com/tools/barcode`,
    });
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header />
        <View style={styles.permissionState}>
          <Ionicons name="camera-outline" size={64} color={colors.textLight} />
          <Text style={styles.permTitle}>Camera access needed</Text>
          <Text style={styles.permText}>Allow camera access to scan barcodes.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const v = result ? VERDICT[result.verdict] : null;
  const flagged = result ? [...(result.nonVeganHits ?? []), ...((result.cosmeticHits ?? []).filter((c) => c.status !== 'vegan').map((c) => c.name))] : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />

      <View style={styles.modeRow}>
        {(['food', 'cosmetics'] as const).map((m) => (
          <TouchableOpacity key={m} style={[styles.modeButton, mode === m && styles.modeButtonActive]} onPress={() => { setMode(m); handleReset(); }}>
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m === 'food' ? '🥫 Food' : '🧴 Cosmetics'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!result ? (
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.cameraFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcodeScan}
          />
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Point the camera at a barcode</Text>
          </View>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.loadingText}>Looking up...</Text>
            </View>
          )}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleReset}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ) : v && (
        <ScrollView style={styles.resultContainer} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          {result!.imageUrl ? <Image source={{ uri: result!.imageUrl }} style={styles.productImage} resizeMode="contain" /> : null}
          <View style={[styles.verdictCard, { backgroundColor: v.bg, borderColor: v.color }]}>
            <Text style={[styles.verdictText, { color: v.color }]}>{v.label}</Text>
            {result!.productName ? <Text style={styles.productName}>{result!.productName}</Text> : null}
            {result!.brand ? <Text style={styles.brandName}>{result!.brand}</Text> : null}
            {result!.reason ? <Text style={styles.reason}>{result!.reason}</Text> : null}
            <Text style={styles.codeText}>Barcode: {result!.barcode}</Text>
          </View>

          {flagged.length > 0 && (
            <View style={styles.flaggedCard}>
              <Text style={styles.flaggedTitle}>Flagged ingredients</Text>
              {flagged.map((ing, i) => <Text key={i} style={styles.flaggedItem}>• {ing}</Text>)}
            </View>
          )}

          {result!.eCodeHits && result!.eCodeHits.length > 0 && (
            <View style={styles.flaggedCard}>
              <Text style={styles.flaggedTitle}>E-numbers detected</Text>
              {result!.eCodeHits.map((h, i) => (
                <Text key={i} style={styles.flaggedItem}>• {h.code} - {h.name}{h.note ? ` (${h.note})` : ''}</Text>
              ))}
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.shareButton} onPress={shareResult}>
              <Ionicons name="share-outline" size={18} color={colors.primary} />
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanAgainButton} onPress={handleReset}>
              <Ionicons name="barcode-outline" size={18} color={colors.white} />
              <Text style={styles.scanAgainText}>Scan another</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Barcode Scanner</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  modeRow: { flexDirection: 'row', margin: spacing.md, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, padding: 4, gap: 4 },
  modeButton: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  modeButtonActive: { backgroundColor: colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  modeText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  modeTextActive: { color: colors.text },
  scannerContainer: { flex: 1, position: 'relative', backgroundColor: '#000', overflow: 'hidden' },
  cameraFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  scanFrame: { width: 240, height: 150, borderWidth: 3, borderColor: colors.white, borderRadius: radius.md, backgroundColor: 'transparent' },
  scanHint: { color: colors.white, fontSize: typography.base, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, overflow: 'hidden' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.white, fontSize: typography.base },
  errorBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.error, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: colors.white, flex: 1 },
  retryText: { color: colors.white, fontWeight: '700', marginLeft: spacing.md },
  resultContainer: { flex: 1 },
  productImage: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.backgroundSecondary },
  verdictCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, gap: 6 },
  verdictText: { fontSize: typography.xl, fontWeight: '800' },
  productName: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  brandName: { fontSize: typography.base, color: colors.textSecondary },
  reason: { fontSize: typography.base, color: colors.text, lineHeight: 21 },
  codeText: { fontSize: typography.sm, color: colors.textLight },
  flaggedCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, gap: 4 },
  flaggedTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  flaggedItem: { fontSize: typography.base, color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  shareButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary },
  shareText: { color: colors.primary, fontWeight: '600', fontSize: typography.base },
  scanAgainButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md },
  scanAgainText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  permTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  permText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.md },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
});
