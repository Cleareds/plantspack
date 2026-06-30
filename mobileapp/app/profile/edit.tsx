import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from('users').select('username, first_name, last_name, bio, avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username ?? '');
          setFirstName(data.first_name ?? '');
          setLastName(data.last_name ?? '');
          setBio(data.bio ?? '');
          setAvatarUrl(data.avatar_url ?? null);
        }
        setLoading(false);
      });
  }, [user]);

  if (!user) { router.replace('/auth'); return null; }

  const pickAvatar = async () => {
    // Uses the Android Photo Picker / iOS picker directly - no media-library
    // permission needed (READ_MEDIA_IMAGES is intentionally not requested).
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const resp = await fetch(uri);
      const arrayBuffer = await resp.arrayBuffer();
      const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars')
        .upload(path, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('users').update({
      username: username.trim() || null,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl,
    }).eq('id', user.id);
    if (error) { setSaving(false); Alert.alert('Could not save', error.message); return; }
    // Also sync auth user_metadata — the Profile tab and other in-app surfaces
    // read avatar/name from the session user, not the users table. This fires
    // USER_UPDATED so the cached session refreshes immediately.
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
    await supabase.auth.updateUser({
      data: {
        avatar_url: avatarUrl,
        full_name: fullName || username.trim() || null,
        name: username.trim() || fullName || null,
      },
    }).catch(() => {});
    setSaving(false);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Edit profile</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 50}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} disabled={uploading}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{(username || user.email || '?')[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                {uploading ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="camera" size={16} color={colors.white} />}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>

            <Field label="Username"><TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" placeholderTextColor={colors.textLight} /></Field>
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}><Field label="First name"><TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First" placeholderTextColor={colors.textLight} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Last name"><TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last" placeholderTextColor={colors.textLight} /></Field></View>
            </View>
            <Field label="Bio"><TextInput style={[styles.input, styles.textarea]} value={bio} onChangeText={setBio} placeholder="A little about you" placeholderTextColor={colors.textLight} multiline /></Field>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Save changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  form: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  avatarWrap: { alignSelf: 'center', marginTop: spacing.sm },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '700', color: colors.primary },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  avatarHint: { alignSelf: 'center', fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  field: { gap: 6 },
  rowFields: { flexDirection: 'row', gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  input: { backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: typography.base, color: colors.text },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 15, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.md },
});
