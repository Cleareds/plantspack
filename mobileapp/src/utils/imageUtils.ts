import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { constants } from '@/src/constants/theme';

export interface PickedImage {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera access is required to take photos. Please enable it in your device settings.',
      [{ text: 'OK' }]
    );
    return false;
  }

  return true;
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Photo library access is required to select photos. Please enable it in your device settings.',
      [{ text: 'OK' }]
    );
    return false;
  }

  return true;
}

/**
 * Pick an image from the camera
 */
export async function pickImageFromCamera(): Promise<PickedImage | null> {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    return {
      uri: asset.uri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`,
      size: asset.fileSize,
    };
  } catch (error) {
    console.error('Error picking image from camera:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
}

/**
 * Pick multiple images from gallery
 */
export async function pickImagesFromGallery(
  maxImages: number = 5
): Promise<PickedImage[]> {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return [];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxImages,
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    return result.assets.map((asset, index) => ({
      uri: asset.uri,
      type: 'image/jpeg',
      name: `image_${Date.now()}_${index}.jpg`,
      size: asset.fileSize,
    }));
  } catch (error) {
    console.error('Error picking images from gallery:', error);
    Alert.alert('Error', 'Failed to select images. Please try again.');
    return [];
  }
}

/**
 * Compress and resize image
 */
export async function compressImage(
  imageUri: string,
  maxWidth: number = constants.IMAGE_MAX_WIDTH,
  quality: number = constants.IMAGE_COMPRESSION_QUALITY
): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: maxWidth,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.WEBP,
      }
    );

    return manipResult.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original URI if compression fails
    return imageUri;
  }
}

/**
 * Compress multiple images
 */
export async function compressImages(
  images: PickedImage[],
  maxWidth: number = constants.IMAGE_MAX_WIDTH,
  quality: number = constants.IMAGE_COMPRESSION_QUALITY
): Promise<PickedImage[]> {
  try {
    const compressedImages = await Promise.all(
      images.map(async (image) => {
        const compressedUri = await compressImage(image.uri, maxWidth, quality);
        return {
          ...image,
          uri: compressedUri,
          type: 'image/webp',
        };
      })
    );

    return compressedImages;
  } catch (error) {
    console.error('Error compressing images:', error);
    return images;
  }
}

/**
 * Validate image size
 */
export function validateImageSize(
  image: PickedImage,
  maxSize: number = constants.MAX_IMAGE_SIZE
): boolean {
  if (!image.size) return true; // Skip validation if size is unknown

  if (image.size > maxSize) {
    Alert.alert(
      'File Too Large',
      `Image size must be less than ${maxSize / 1024 / 1024}MB`
    );
    return false;
  }

  return true;
}

/**
 * Validate total upload size
 */
export function validateTotalUploadSize(
  images: PickedImage[],
  maxTotalSize: number = constants.MAX_TOTAL_UPLOAD_SIZE
): boolean {
  const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);

  if (totalSize > maxTotalSize) {
    Alert.alert(
      'Total Size Too Large',
      `Total upload size must be less than ${maxTotalSize / 1024 / 1024}MB`
    );
    return false;
  }

  return true;
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  uri: string
): Promise<{ width: number; height: number } | null> {
  try {
    return new Promise((resolve, reject) => {
      // Use Image.getSize from react-native
      const { Image } = require('react-native');
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
}
