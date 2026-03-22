export default function UpgradePrompt() {
  return null
}

export const UPGRADE_PROMPTS = {
  longPost: {
    feature: "Longer Posts",
    description: "",
    suggestedTier: 'medium' as const
  },
  multipleImages: {
    feature: "Multiple Images",
    description: "",
    suggestedTier: 'medium' as const
  },
  location: {
    feature: "Location Sharing",
    description: "",
    suggestedTier: 'medium' as const
  },
  premiumFeatures: {
    feature: "Premium Features",
    description: "",
    suggestedTier: 'premium' as const
  }
}
