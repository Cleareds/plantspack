import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/src/store/authStore';
import { usePostStore } from '@/src/store/postStore';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import type { PostPrivacy } from '@/src/types/database';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
}

const CHARACTER_LIMITS = {
  free: 280,
  supporter: 500,
  premium: 1000,
};

const IMAGE_LIMITS = {
  free: 1,
  supporter: 7,
  premium: 99, // unlimited
};

const VIDEO_LIMITS = {
  free: 0,
  supporter: 1,
  premium: 3,
};

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ visible, onClose }) => {
  const { profile } = useAuthStore();
  const { createPost } = usePostStore();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PostPrivacy>('public');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tier = profile?.subscription_tier || 'free';
  const charLimit = CHARACTER_LIMITS[tier];
  const imageLimit = IMAGE_LIMITS[tier];
  const videoLimit = VIDEO_LIMITS[tier];
  const remainingChars = charLimit - content.length;

  const handleClose = () => {
    if (content || images.length > 0) {
      Alert.alert('Discard Post?', 'Are you sure you want to discard this post?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            resetForm();
            onClose();
          },
        },
      ]);
    } else {
      onClose();
    }
  };

  const resetForm = () => {
    setContent('');
    setPrivacy('public');
    setImages([]);
  };

  const pickImages = async () => {
    if (images.length >= imageLimit) {
      Alert.alert(
        'Image Limit Reached',
        `Your ${tier} tier allows ${imageLimit} ${imageLimit === 1 ? 'image' : 'images'} per post. ${
          tier === 'free' ? 'Upgrade to Supporter for 7 images or Premium for unlimited!' : ''
        }`
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset) => asset.uri);
        const totalImages = images.length + newImages.length;

        if (totalImages > imageLimit) {
          Alert.alert(
            'Too Many Images',
            `You can only add ${imageLimit - images.length} more ${
              imageLimit - images.length === 1 ? 'image' : 'images'
            }.`
          );
          setImages([...images, ...newImages.slice(0, imageLimit - images.length)]);
        } else {
          setImages([...images, ...newImages]);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImages = async (imageUris: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const uri of imageUris) {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('posts').getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('Empty Post', 'Please add some content or images to your post.');
      return;
    }

    if (content.length > charLimit) {
      Alert.alert('Too Long', `Please keep your post under ${charLimit} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedImageUrls: string[] = [];

      if (images.length > 0) {
        uploadedImageUrls = await uploadImages(images);
      }

      await createPost({
        content: content.trim(),
        privacy,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
      });

      Alert.alert('Success', 'Post created successfully!');
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || (!content.trim() && images.length === 0)}
          >
            <Text
              style={[
                styles.postButton,
                (isSubmitting || (!content.trim() && images.length === 0)) &&
                  styles.postButtonDisabled,
              ]}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.text.tertiary}
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={charLimit}
            editable={!isSubmitting}
            autoFocus
          />

          {/* Character Count */}
          <Text
            style={[
              styles.charCount,
              remainingChars < 20 && styles.charCountWarning,
              remainingChars < 0 && styles.charCountError,
            ]}
          >
            {remainingChars} characters remaining
          </Text>

          {/* Images Preview */}
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Privacy Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <View style={styles.privacyOptions}>
              <TouchableOpacity
                style={[styles.privacyButton, privacy === 'public' && styles.privacyButtonActive]}
                onPress={() => setPrivacy('public')}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={privacy === 'public' ? colors.primary[500] : colors.gray[600]}
                />
                <Text
                  style={[
                    styles.privacyText,
                    privacy === 'public' && styles.privacyTextActive,
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.privacyButton,
                  privacy === 'followers' && styles.privacyButtonActive,
                ]}
                onPress={() => setPrivacy('followers')}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={privacy === 'followers' ? colors.primary[500] : colors.gray[600]}
                />
                <Text
                  style={[
                    styles.privacyText,
                    privacy === 'followers' && styles.privacyTextActive,
                  ]}
                >
                  Followers
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Actions Bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={pickImages}
            disabled={isSubmitting || images.length >= imageLimit}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color={images.length >= imageLimit ? colors.gray[400] : colors.primary[500]}
            />
            <Text style={styles.actionButtonText}>
              {images.length}/{imageLimit}
            </Text>
          </TouchableOpacity>

          {tier === 'free' && (
            <Text style={styles.upgradeHint}>
              Upgrade to add more images & videos
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  cancelButton: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  postButton: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primary[500],
  },
  postButtonDisabled: {
    color: colors.gray[400],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  textInput: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingVertical: spacing[4],
  },
  charCount: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginBottom: spacing[3],
  },
  charCountWarning: {
    color: colors.warning,
  },
  charCountError: {
    color: colors.danger,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  imageWrapper: {
    position: 'relative',
    width: '48%',
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: borderRadius.base,
    backgroundColor: colors.gray[200],
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.base,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  privacyButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  privacyText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  privacyTextActive: {
    color: colors.primary[500],
    fontWeight: typography.weights.semibold,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  upgradeHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
});
