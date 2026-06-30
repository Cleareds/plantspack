import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Platform, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { AuthPromptModal } from '../ui/AuthPromptModal';
import { PhotoPicker } from '../ui/PhotoPicker';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface ReviewUser { username: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null; }
interface Review { id: string; user_id: string; rating: number; content: string | null; images: string[] | null; created_at: string; users: ReviewUser | null; }

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
function authorName(u: ReviewUser | null): string {
  if (!u) return 'PlantsPack member';
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return full || u.username || 'PlantsPack member';
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const n = Math.max(0, Math.min(5, rating));
  return (
    <Text style={{ fontSize: size, color: '#f59e0b' }}>
      {'★'.repeat(n)}<Text style={{ color: colors.border }}>{'★'.repeat(5 - n)}</Text>
    </Text>
  );
}

export function PlaceReviews({ placeId }: { placeId: string }) {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mine, setMine] = useState<Review | null>(null);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  // KeyboardAvoidingView does not work inside a Modal on Android (the Modal's
  // window isn't resized for the keyboard), so we track the keyboard height and
  // lift the sheet ourselves — reliable on both platforms.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const load = useCallback(async () => {
    if (!placeId) return;
    const { data } = await supabase
      .from('place_reviews')
      .select('id, user_id, rating, content, images, created_at, users(username, first_name, last_name, avatar_url)')
      .eq('place_id', placeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);
    setReviews((data ?? []) as unknown as Review[]);
    setLoaded(true);

    if (user) {
      const { data: own } = await supabase
        .from('place_reviews')
        .select('id, user_id, rating, content, images, created_at, users(username, first_name, last_name, avatar_url)')
        .eq('place_id', placeId).eq('user_id', user.id).is('deleted_at', null).maybeSingle();
      setMine((own as unknown as Review) ?? null);
    } else {
      setMine(null);
    }
  }, [placeId, user]);

  useEffect(() => { load(); }, [load]);

  const openForm = () => {
    if (!user) { setShowAuth(true); return; }
    setRating(mine?.rating ?? 0);
    setContent(mine?.content ?? '');
    setImages(mine?.images ?? []);
    setEditing(true);
  };

  const closeForm = () => {
    Keyboard.dismiss();
    setEditing(false);
  };

  const submit = async () => {
    if (!user) { setShowAuth(true); return; }
    if (rating < 1) { Alert.alert('Add a rating', 'Tap the stars to rate from 1 to 5.'); return; }
    if (content.trim().length < 1) { Alert.alert('Add a few words', 'Please write a short review.'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('place_reviews')
        .upsert(
          { place_id: placeId, user_id: user.id, rating, content: content.trim().slice(0, 500), images: images.length ? images.slice(0, 5) : null },
          { onConflict: 'place_id,user_id' },
        );
      if (error) throw error;
      Keyboard.dismiss();
      setEditing(false);
      await load();
    } catch (e: any) {
      Alert.alert('Could not post review', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Hide entirely for guests when there are no reviews to show.
  if (loaded && reviews.length === 0 && !user) return null;

  const others = reviews.filter((r) => r.user_id !== user?.id);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reviews</Text>

      <TouchableOpacity style={styles.writeBtn} onPress={openForm} accessibilityRole="button">
        <Ionicons name={mine ? 'create-outline' : 'star-outline'} size={16} color={colors.primary} />
        <Text style={styles.writeText}>{mine ? 'Edit your review' : 'Write a review'}</Text>
      </TouchableOpacity>

      <Modal visible={editing} transparent animationType="slide" statusBarTranslucent onRequestClose={closeForm}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeForm} />
          <View style={[styles.sheet, { marginBottom: keyboardHeight }]}>
            <View style={styles.handle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <Text style={styles.sheetTitle}>{mine ? 'Edit your review' : 'Write a review'}</Text>
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                    <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color="#f59e0b" />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Share what you ate and how it was..."
                placeholderTextColor={colors.textLight}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={500}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.counter}>{content.length}/500</Text>
              <PhotoPicker value={images} onChange={setImages} max={5} />
              <View style={styles.formActions}>
                <TouchableOpacity onPress={closeForm} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={submit} style={styles.postBtn} disabled={submitting}>
                  {submitting ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.postText}>{mine ? 'Update review' : 'Post review'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* The user's own review first (if any) */}
      {mine && !editing && <ReviewRow review={mine} isMine />}

      {others.length === 0 && !mine ? (
        <Text style={styles.none}>No reviews yet. Be the first.</Text>
      ) : (
        others.map((r) => <ReviewRow key={r.id} review={r} />)
      )}

      <AuthPromptModal
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        title="Sign in to review"
        message="Create a free account to share your experience and help other vegans."
      />
    </View>
  );
}

function ReviewRow({ review, isMine }: { review: Review; isMine?: boolean }) {
  const u = review.users;
  const name = isMine ? 'You' : authorName(u);
  return (
    <View style={styles.review}>
      <View style={styles.reviewHead}>
        {u?.avatar_url ? (
          <Image source={{ uri: u.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{name[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewName} numberOfLines={1}>{name}</Text>
          <View style={styles.reviewSub}>
            <Stars rating={review.rating} />
            <Text style={styles.reviewDate}>  {timeAgo(review.created_at)}</Text>
          </View>
        </View>
      </View>
      {review.content ? <Text style={styles.reviewBody}>{review.content}</Text> : null}
      {review.images && review.images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotos} contentContainerStyle={{ gap: spacing.sm }}>
          {review.images.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.reviewPhoto} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  writeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary,
  },
  writeText: { color: colors.primary, fontWeight: '600', fontSize: typography.base },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  sheetContent: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  sheetTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  starPicker: { flexDirection: 'row', gap: 8, alignSelf: 'center' },
  input: {
    minHeight: 90, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: typography.base, color: colors.text, backgroundColor: colors.background,
  },
  counter: { fontSize: typography.xs, color: colors.textLight, textAlign: 'right' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, alignItems: 'center' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: spacing.md },
  cancelText: { color: colors.textSecondary, fontSize: typography.base, fontWeight: '500' },
  postBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: spacing.lg, borderRadius: radius.md, minWidth: 120, alignItems: 'center' },
  postText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
  none: { fontSize: typography.base, color: colors.textSecondary },
  review: { gap: 6, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: typography.base, fontWeight: '700', color: colors.primary },
  reviewMeta: { flex: 1, gap: 2 },
  reviewName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  reviewSub: { flexDirection: 'row', alignItems: 'center' },
  reviewDate: { fontSize: typography.sm, color: colors.textSecondary },
  reviewBody: { fontSize: typography.base, color: colors.text, lineHeight: 21 },
  reviewPhotos: { marginTop: spacing.sm },
  reviewPhoto: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.backgroundSecondary },
});
