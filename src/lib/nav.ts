// Single source of truth for primary navigation.
// Sidebar (desktop) renders NAV_PILLARS (expandable sections + leaf links).
// BottomNav (mobile web) renders BOTTOM_NAV (a flat, mobile-specific subset).

export interface NavChild {
  href: string
  label: string
}

export interface NavPillar {
  key: string
  href: string // the section's landing page (icon+label links here)
  label: string
  icon: string // material symbol name
  children?: NavChild[] // when present, the sidebar renders an expandable section
}

export const NAV_PILLARS: NavPillar[] = [
  {
    key: 'explore',
    href: '/map',
    label: 'Explore',
    icon: 'explore',
    children: [
      { href: '/map', label: 'Map' },
      { href: '/vegan-places', label: 'Vegan Places' },
      { href: '/city-ranks', label: 'City Rankings' },
    ],
  },
  {
    key: 'kitchen',
    href: '/recipes',
    label: 'Recipes',
    icon: 'restaurant_menu',
    // Collections hidden for now - not enough tagged recipes yet to be useful.
    // Becomes an expandable section again once Collections is ready.
  },
  {
    key: 'tools',
    href: '/tools',
    label: 'Tools',
    icon: 'handyman',
  },
  {
    key: 'library',
    href: '/library',
    label: 'Library',
    icon: 'local_library',
    children: [
      { href: '/vegan', label: 'Answers' },
      { href: '/glossary', label: 'Glossary' },
      { href: '/blog', label: 'Reads' },
    ],
  },
  {
    key: 'community',
    href: '/feed',
    label: 'Community',
    icon: 'forum',
    children: [
      { href: '/feed', label: 'Feed' },
      { href: '/packs', label: 'Packs / Trips' },
      { href: '/events', label: 'Events' },
    ],
  },
]

// Mobile bottom nav - a flat, mobile-specific set. Map + Places kept separate,
// Kitchen omitted for now (not relevant yet). Profile is rendered separately.
export const BOTTOM_NAV: { href: string; label: string; icon: string }[] = [
  { href: '/map', label: 'Map', icon: 'explore' },
  { href: '/vegan-places', label: 'Places', icon: 'place' },
  { href: '/tools', label: 'Tools', icon: 'handyman' },
  { href: '/library', label: 'Library', icon: 'local_library' },
]

export const COMMUNITY_PILLAR = NAV_PILLARS.find((p) => p.key === 'community')!
