import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ASKED_KEY = 'review_asked_v1';
const COUNT_KEY = 'positive_action_count';
const THRESHOLD = 3;

/**
 * Nudge for an App Store / Play rating after a few positive actions, at most
 * once per install. Ratings are a major store search-ranking signal. The OS
 * itself rate-limits and may suppress the native dialog, so this is a hint, not
 * a guarantee — never gate UX on it. Best-effort and silent on failure.
 */
export async function recordPositiveAction(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(ASKED_KEY)) return;
    const n = parseInt((await AsyncStorage.getItem(COUNT_KEY)) ?? '0', 10) + 1;
    await AsyncStorage.setItem(COUNT_KEY, String(n));
    if (n < THRESHOLD) return;
    if (!(await StoreReview.hasAction())) return;
    await StoreReview.requestReview();
    await AsyncStorage.setItem(ASKED_KEY, '1');
  } catch {
    // A rating prompt must never interfere with the action that triggered it.
  }
}
