import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../src/store/authStore';
import { submitPlace } from '../src/lib/placeSubmissions';
import { PhotoPicker } from '../src/components/ui/PhotoPicker';
import { track } from '../src/lib/analytics';
import { CATEGORIES, VEGAN_LEVELS } from '../src/constants/filters';
import { colors, spacing, radius, typography } from '../src/constants/theme';

export default function SuggestPlaceScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('eat');
  const [veganLevel, setVeganLevel] = useState('vegan_friendly');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Guest gate — push to auth, return here after sign-in.
  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Suggest a place" />
        <View style={styles.gate}>
          <Ionicons name="add-circle-outline" size={56} color={colors.primary} />
          <Text style={styles.gateTitle}>Sign in to suggest a place</Text>
          <Text style={styles.gateSub}>
            Help fellow vegans find great spots. Sign in free — your suggestion is reviewed by our
            team before it goes live.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth')}>
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Suggest a place" />
        <View style={styles.gate}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={styles.gateTitle}>Thanks for the suggestion!</Text>
          <Text style={styles.gateSub}>
            Our team will review {name.trim() || 'it'} and add it to the map once it&apos;s confirmed.
            We review every submission to keep PlantsPack accurate.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location off', 'Enable location access to attach coordinates.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Couldn&apos;t get location', 'Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter the place name.');
      return;
    }
    setSubmitting(true);
    const { error } = await submitPlace({
      name,
      category,
      vegan_level: veganLevel,
      address,
      city,
      country,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      website,
      notes,
      images,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Could not submit', error);
      return;
    }
    track('suggest_place_submitted', { category, vegan_level: veganLevel, has_coords: !!coords, photo_count: images.length });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDone(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Suggest a place" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 50}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Know a vegan or vegan-friendly spot we&apos;re missing? Tell us about it. We review every
            suggestion before it appears.
          </Text>

          <Field label="Place name" required>
            <TextInput
              style={styles.input}
              placeholder="e.g. Green Garden Cafe"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={setName}
            />
          </Field>

          <Text style={styles.label}>Type</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} icon={c.icon} active={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </View>

          <Text style={styles.label}>Vegan level</Text>
          <View style={styles.chips}>
            {VEGAN_LEVELS.map((v) => (
              <Chip key={v.value} label={v.label} active={veganLevel === v.value} onPress={() => setVeganLevel(v.value)} />
            ))}
          </View>

          <Field label="Address">
            <TextInput
              style={styles.input}
              placeholder="Street and number"
              placeholderTextColor={colors.textLight}
              value={address}
              onChangeText={setAddress}
            />
          </Field>

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="City">
                <TextInput style={styles.input} placeholder="City" placeholderTextColor={colors.textLight} value={city} onChangeText={setCity} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Country">
                <TextInput style={styles.input} placeholder="Country" placeholderTextColor={colors.textLight} value={country} onChangeText={setCountry} />
              </Field>
            </View>
          </View>

          <TouchableOpacity style={styles.locationBtn} onPress={useMyLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name={coords ? 'checkmark-circle' : 'location-outline'} size={18} color={coords ? colors.success : colors.primary} />
            )}
            <Text style={styles.locationBtnText}>
              {coords ? `Location attached (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : 'Use my current location'}
            </Text>
          </TouchableOpacity>

          <Field label="Website">
            <TextInput
              style={styles.input}
              placeholder="https://"
              placeholderTextColor={colors.textLight}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              keyboardType="url"
            />
          </Field>

          <Field label="Notes">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Anything that helps us verify it — menu, what makes it vegan, opening hours..."
              placeholderTextColor={colors.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Field>

          <Text style={styles.label}>Photos</Text>
          <PhotoPicker value={images} onChange={setImages} max={3} />

          <TouchableOpacity style={[styles.primaryBtn, submitting && styles.btnDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Submit suggestion</Text>}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Submissions are reviewed before going live. Please only suggest places that serve vegan
            food or have clear vegan options.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.error }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function Chip({ label, icon, active, onPress }: { label: string; icon?: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      {icon ? <Ionicons name={icon as any} size={15} color={active ? colors.white : colors.textSecondary} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
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

  form: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { fontSize: typography.base, color: colors.textSecondary, lineHeight: 21 },
  field: { gap: 6 },
  rowFields: { flexDirection: 'row', gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.backgroundSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: typography.base, color: colors.text,
  },
  textarea: { height: 96, textAlignVertical: 'top', paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary,
  },
  locationBtnText: { color: colors.primary, fontWeight: '600', fontSize: typography.sm },
  primaryBtn: {
    backgroundColor: colors.primary, paddingVertical: 15, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.md },
  disclaimer: { fontSize: typography.xs, color: colors.textLight, textAlign: 'center', lineHeight: 16 },

  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  gateTitle: { fontSize: typography.lg, fontWeight: '800', color: colors.text, textAlign: 'center' },
  gateSub: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});
