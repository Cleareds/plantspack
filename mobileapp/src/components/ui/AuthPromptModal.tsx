import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function AuthPromptModal({
  visible,
  onClose,
  title = 'Sign in to continue',
  message = 'Create a free account to save places, get unlimited scans, and sync across devices.',
}: AuthPromptModalProps) {
  const handleSignIn = () => {
    onClose();
    router.push('/auth');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn}>
            <Text style={styles.primaryText}>Sign up - it's free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: typography.base,
  },
});
