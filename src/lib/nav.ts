// Single source of truth for primary navigation. Consumed by Sidebar (desktop),
// BottomNav (mobile web), and the TopBar "More" menu so the surfaces never drift
// apart again. Material Symbols icon names are used for sidebar + bottom nav.

export interface NavChild {
  href: string
  label: string
}

export interface NavPillar {
  key: string
  href: string // the pillar's landing page
  label: string
  icon: string // material symbol name
  children?: NavChild[] // shown nested in the desktop sidebar
  inBottomNav?: boolean // show as a slot in the mobile bottom nav
}

export const NAV_PILLARS: NavPillar[] = [
  {
    key: 'explore',
    href: '/map',
    label: 'Explore',
    icon: 'explore',
    inBottomNav: true,
    children: [
      { href: '/map', label: 'Map' },
      { href: '/vegan-places', label: 'Vegan Places' },
      { href: '/city-ranks', label: 'City Rankings' },
    ],
  },
  {
    key: 'kitchen',
    href: '/recipes',
    label: 'Kitchen',
    icon: 'restaurant_menu',
    inBottomNav: true,
    children: [
      { href: '/recipes', label: 'Recipes' },
      { href: '/recipes/collections', label: 'Collections' },
    ],
  },
  {
    key: 'tools',
    href: '/tools',
    label: 'Tools',
    icon: 'handyman',
    inBottomNav: true,
  },
  {
    key: 'library',
    href: '/library',
    label: 'Library',
    icon: 'local_library',
    inBottomNav: true,
  },
  {
    key: 'community',
    href: '/feed',
    label: 'Community',
    icon: 'forum',
    // Not in the bottom nav - reachable via the TopBar "More" menu.
    children: [
      { href: '/feed', label: 'Feed' },
      { href: '/packs', label: 'Packs / Trips' },
      { href: '/events', label: 'Events' },
    ],
  },
]

// Convenience views.
export const BOTTOM_NAV_PILLARS = NAV_PILLARS.filter((p) => p.inBottomNav)
export const COMMUNITY_PILLAR = NAV_PILLARS.find((p) => p.key === 'community')!
