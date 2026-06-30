export const VEGAN_COLORS = {
  fully_vegan: '#16a34a',
  mostly_vegan: '#65a30d',
  vegan_friendly: '#d97706',
  vegan_options: '#9ca3af',
  unknown: '#9ca3af',
} as const;

export const VEGAN_LABELS = {
  fully_vegan: 'Fully Vegan',
  mostly_vegan: 'Mostly Vegan',
  vegan_friendly: 'Vegan Friendly',
  vegan_options: 'Vegan Options',
  unknown: 'Unknown',
} as const;

export type VeganLevel = keyof typeof VEGAN_COLORS;
