import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

// Same public bucket + path scheme the web uses (ImageUploader.tsx), so images
// render identically wherever they're shown: `${userId}/${ts}-${rand}.jpg`.
const BUCKET = 'post-images';

// Resize to max 1200px wide + JPEG q0.7 (mirrors the web compression) so we
// never upload a 4000px phone photo. Returns the public URL, or null on failure.
async function compressAndUpload(userId: string, uri: string): Promise<string | null> {
  try {
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!manip.base64) return null;
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, decode(manip.base64), {
      contentType: 'image/jpeg',
      cacheControl: '2592000',
      upsert: false,
    });
    if (error) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export type PickResult = { urls: string[]; failed: number };

/**
 * Let the user pick up to `max` photos from their library, compress + upload
 * them, and return the resulting public URLs. Optional by nature: returns an
 * empty result if the user cancels or denies library permission.
 */
export async function pickAndUploadImages(userId: string, max: number): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { urls: [], failed: 0 };

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: max > 1,
    selectionLimit: max,
    quality: 1, // we compress ourselves below
  });
  if (res.canceled) return { urls: [], failed: 0 };

  const urls: string[] = [];
  let failed = 0;
  for (const asset of res.assets.slice(0, max)) {
    const url = await compressAndUpload(userId, asset.uri);
    if (url) urls.push(url); else failed++;
  }
  return { urls, failed };
}

export async function libraryPermissionDenied(): Promise<boolean> {
  const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  return !perm.granted && !perm.canAskAgain;
}
