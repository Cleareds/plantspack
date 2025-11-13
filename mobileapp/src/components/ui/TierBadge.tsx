import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/src/constants/theme';
import type { SubscriptionTier } from '@/src/types/database';

interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: 'sm' | 'md';
}

const TIER_CONFIG: Record<SubscriptionTier, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  free: {
    label: 'Free',
    color: colors.tier.free,
    icon: 'leaf-outline',
  },
  medium: {
    label: 'Supporter',
    color: colors.tier.medium,
    icon: 'shield-checkmark',
  },
  premium: {
    label: 'Premium',
    color: colors.tier.premium,
    icon: 'star',
  },
};

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, size = 'sm' }) => {
  const config = TIER_CONFIG[tier];
  const iconSize = size === 'sm' ? 12 : 16;
  const fontSize = size === 'sm' ? typography.sizes.xs : typography.sizes.sm;

  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Ionicons name={config.icon} size={iconSize} color={colors.text.inverse} />
      <Text style={[styles.label, { fontSize }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  label: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
});
